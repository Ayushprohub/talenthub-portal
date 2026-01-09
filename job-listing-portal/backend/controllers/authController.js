const User = require('../models/user');
const { jwtService, passwordService } = require('../services');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profiles';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Authentication Controller
 * Handles user registration, login, logout, and profile operations
 */
class AuthController {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const { 
        email, 
        password, 
        fullName, 
        userType,
        companyName,
        companyDescription,
        contactEmail,
        companyWebsite,
        companySize,
        industry
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
          errors: [{ field: 'email', message: 'Email is already registered' }]
        });
      }

      // Hash the password
      const hashedPassword = await passwordService.hashPassword(password);

      // Create user data object
      const userData = {
        email,
        password: hashedPassword,
        fullName,
        userType
      };

      // Handle profile picture if uploaded
      if (req.file) {
        userData.profilePicture = `/uploads/profiles/${req.file.filename}`;
      }

      // Add employer-specific fields if user is an employer
      if (userType === 'employer') {
        userData.companyName = companyName;
        userData.companyDescription = companyDescription;
        userData.contactEmail = contactEmail;
        if (companyWebsite) userData.companyWebsite = companyWebsite;
        if (companySize) userData.companySize = companySize;
        if (industry) userData.industry = industry;
        
        // Generate verification token for employers
        userData.verificationToken = emailService.generateVerificationToken();
        userData.isVerified = false; // Employers need email verification
      } else {
        // Job seekers are automatically verified
        userData.isVerified = true;
        userData.verifiedAt = new Date();
      }

      // Create new user
      const user = new User(userData);

      await user.save();

      // Send verification email for employers
      let emailResult = null;

     if (userType === 'employer' && process.env.ENABLE_EMAIL === 'true') {
     try {
    emailResult = await emailService.sendVerificationEmail(
      user,
      userData.verificationToken
     );
     } catch (emailError) {
    console.error('Email failed, continuing registration:', emailError.message);
   }
 }


      // Generate JWT token for auto-login
      const token = jwtService.generateToken({
        userId: user._id,
        email: user.email,
        userType: user.userType
      });

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      const response = {
        success: true,
        message: userType === 'employer' 
          ? 'Registration successful! Please check your email to verify your account before posting jobs.'
          : 'User registered successfully',
        user: user.toJSON(),
        token
      };

      // Include email info for development
      if (userType === 'employer' && emailResult && process.env.NODE_ENV !== 'production') {
        response.emailInfo = {
          sent: emailResult.success,
          previewUrl: emailResult.previewUrl,
          verificationUrl: emailResult.verificationUrl
        };
      }

      res.status(201).json(response);

    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle multer errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Profile picture file size too large (max 5MB)',
            errors: [{ field: 'profilePicture', message: 'File size must be less than 5MB' }]
          });
        }
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          errors: [{ field: 'profilePicture', message: error.message }]
        });
      }

      // Handle file type errors
      if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type',
          errors: [{ field: 'profilePicture', message: 'Only image files (JPG, PNG, GIF) are allowed' }]
        });
      }
      
      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        const errors = Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      // Handle duplicate key error (email already exists)
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
          errors: [{ field: 'email', message: 'Email is already registered' }]
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Verify password
      const isPasswordValid = await passwordService.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwtService.generateToken({
        userId: user._id,
        email: user.email,
        userType: user.userType
      });

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Login successful',
        user: user.toJSON(),
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Logout user (client-side token invalidation)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      // Since we're using stateless JWT tokens, logout is primarily handled client-side
      // by removing the token from storage. We just confirm the logout action.
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user profile (protected route)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      // User is already attached to req by auth middleware
      const user = req.user;

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify email address
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      // Find user with this verification token
      const user = await User.findOne({ 
        verificationToken: token,
        isVerified: false 
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }

      // Verify the user
      await user.verify();

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail verification if welcome email fails
      }

      res.json({
        success: true,
        message: 'Email verified successfully! You can now create job listings.',
        user: user.toJSON()
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Resend verification email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      // Find unverified user
      const user = await User.findOne({ 
        email: email.toLowerCase().trim(),
        isVerified: false,
        userType: 'employer'
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No unverified employer account found with this email address'
        });
      }

      // Resend verification email
      const emailResult = await emailService.resendVerificationEmail(user);

      const response = {
        success: true,
        message: 'Verification email sent successfully! Please check your inbox.'
      };

      // Include email info for development
      if (process.env.NODE_ENV !== 'production') {
        response.emailInfo = {
          sent: emailResult.success,
          previewUrl: emailResult.previewUrl,
          verificationUrl: emailResult.verificationUrl
        };
      }

      res.json(response);

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }
  }

  /**
   * Check verification status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkVerificationStatus(req, res) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      const user = await User.findOne({ 
        email: email.toLowerCase().trim() 
      }).select('email userType isVerified verifiedAt');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        verification: {
          email: user.email,
          userType: user.userType,
          isVerified: user.isVerified,
          verifiedAt: user.verifiedAt,
          requiresVerification: user.userType === 'employer'
        }
      });

    } catch (error) {
      console.error('Check verification status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = { 
  authController: new AuthController(),
  profilePictureUpload: upload.single('profilePicture')
};