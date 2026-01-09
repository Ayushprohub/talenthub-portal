import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [profileImage, setProfileImage] = useState(null);
  const [skills, setSkills] = useState(['JavaScript', 'React', 'Node.js', 'Python', 'MongoDB', 'Express.js']);
  const [newSkill, setNewSkill] = useState('');
  const [achievements, setAchievements] = useState([
    { id: 1, title: 'Profile Complete', description: 'Complete your profile information', completed: true, icon: '👤' },
    { id: 2, title: 'First Application', description: 'Submit your first job application', completed: true, icon: '📝' },
    { id: 3, title: 'Skill Master', description: 'Add 5 or more skills', completed: true, icon: '🎯' },
    { id: 4, title: 'Active Seeker', description: 'Apply to 10 jobs', completed: false, icon: '🚀' }
  ]);
  const [profileStats, setProfileStats] = useState({
    profileViews: 127,
    applicationsSubmitted: 8,
    interviewsScheduled: 3,
    profileCompleteness: 85
  });
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    userType: user?.userType || 'jobseeker',
    phone: user?.phone || '+1 (555) 123-4567',
    location: user?.location || 'San Francisco, CA',
    bio: user?.bio || 'Passionate full-stack developer with 3+ years of experience building scalable web applications. Love working with modern technologies and solving complex problems.',
    experience: user?.experience || '3 years',
    education: user?.education || 'Bachelor of Science in Computer Science',
    website: user?.website || 'https://johndoe.dev',
    linkedin: user?.linkedin || 'https://linkedin.com/in/johndoe',
    github: user?.github || 'https://github.com/johndoe',
    jobTitle: user?.jobTitle || 'Full Stack Developer',
    company: user?.company || 'Tech Solutions Inc.',
    salary: user?.salary || '$75,000 - $90,000',
    availability: user?.availability || 'Available immediately'
  });

  // Animation effect for stats
  useEffect(() => {
    const animateStats = () => {
      const statElements = document.querySelectorAll('.stat-number');
      statElements.forEach((element, index) => {
        const finalValue = parseInt(element.textContent);
        let currentValue = 0;
        const increment = finalValue / 50;
        const timer = setInterval(() => {
          currentValue += increment;
          if (currentValue >= finalValue) {
            element.textContent = finalValue;
            clearInterval(timer);
          } else {
            element.textContent = Math.floor(currentValue);
          }
        }, 30);
      });
    };

    const timer = setTimeout(animateStats, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // TODO: Implement profile update API call
    console.log('Saving profile:', formData);
    setIsEditing(false);
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'profile-success-notification animate-slide-in-up';
    notification.innerHTML = `
      <div class="success-icon">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <span>Profile updated successfully!</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      userType: user?.userType || 'jobseeker',
      phone: user?.phone || '',
      location: user?.location || '',
      bio: user?.bio || '',
      experience: user?.experience || '',
      education: user?.education || '',
      website: user?.website || '',
      linkedin: user?.linkedin || '',
      github: user?.github || ''
    });
    setIsEditing(false);
  };

  const getCompletionPercentage = () => {
    const fields = Object.values(formData);
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  if (!user) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner">
          <svg className="spinner" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <span>Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className="profile-container animate-fade-in">
      {/* Profile Header */}
      <div className="profile-header animate-slide-in-up">
        <div className="profile-cover">
          <div className="profile-avatar-section">
            <div className="profile-avatar" onClick={() => fileInputRef.current?.click()}>
              {profileImage ? (
                <img src={profileImage} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div className="avatar-overlay">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
          
          <div className="profile-info">
            <h1 className="profile-name">{formData.fullName}</h1>
            <p className="profile-title">{formData.jobTitle}</p>
            <p className="profile-location">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {formData.location}
            </p>
            
            <div className="profile-completion">
              <div className="completion-bar">
                <div 
                  className="completion-fill" 
                  style={{ width: `${getCompletionPercentage()}%` }}
                ></div>
              </div>
              <span className="completion-text">{getCompletionPercentage()}% Complete</span>
            </div>
          </div>

          <div className="profile-actions">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button onClick={handleSave} className="btn btn-success">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </button>
                <button onClick={handleCancel} className="btn btn-secondary">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="profile-stats animate-slide-in-up animate-delay-1">
        <div className="stat-card">
          <div className="stat-icon stat-icon-views">👁️</div>
          <div className="stat-number">{profileStats.profileViews}</div>
          <div className="stat-label">Profile Views</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-applications">📄</div>
          <div className="stat-number">{profileStats.applicationsSubmitted}</div>
          <div className="stat-label">Applications</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-interviews">🎯</div>
          <div className="stat-number">{profileStats.interviewsScheduled}</div>
          <div className="stat-label">Interviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-completion">⭐</div>
          <div className="stat-number">{profileStats.profileCompleteness}</div>
          <div className="stat-label">Completion %</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs animate-slide-in-up animate-delay-2">
        {[
          { key: 'personal', label: 'Personal Info', icon: '👤' },
          { key: 'professional', label: 'Professional', icon: '💼' },
          { key: 'skills', label: 'Skills & Expertise', icon: '🎯' },
          { key: 'achievements', label: 'Achievements', icon: '🏆' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="profile-content animate-slide-in-up animate-delay-3">
        {activeTab === 'personal' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Personal Information</h2>
              <p>Manage your personal details and contact information</p>
            </div>
            
            {isEditing ? (
              <form className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled
                    />
                    <small>Contact support to change your email</small>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows="4"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </form>
            ) : (
              <div className="profile-display">
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Full Name</div>
                    <div className="info-value">{formData.fullName}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Email</div>
                    <div className="info-value">{formData.email}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Phone</div>
                    <div className="info-value">{formData.phone}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Location</div>
                    <div className="info-value">{formData.location}</div>
                  </div>
                  <div className="info-item full-width">
                    <div className="info-label">Bio</div>
                    <div className="info-value">{formData.bio}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'professional' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Professional Information</h2>
              <p>Showcase your career details and professional links</p>
            </div>
            
            {isEditing ? (
              <form className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Job Title</label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Experience</label>
                    <select
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">Select experience</option>
                      <option value="0-1 years">0-1 years</option>
                      <option value="1-3 years">1-3 years</option>
                      <option value="3-5 years">3-5 years</option>
                      <option value="5-10 years">5-10 years</option>
                      <option value="10+ years">10+ years</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Salary Range</label>
                    <input
                      type="text"
                      name="salary"
                      value={formData.salary}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., $70,000 - $90,000"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Education</label>
                  <input
                    type="text"
                    name="education"
                    value={formData.education}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn</label>
                    <input
                      type="url"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>GitHub</label>
                  <input
                    type="url"
                    name="github"
                    value={formData.github}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </form>
            ) : (
              <div className="profile-display">
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Current Position</div>
                    <div className="info-value">{formData.jobTitle} at {formData.company}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Experience</div>
                    <div className="info-value">{formData.experience}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Education</div>
                    <div className="info-value">{formData.education}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Salary Range</div>
                    <div className="info-value">{formData.salary}</div>
                  </div>
                </div>
                
                <div className="social-links">
                  <h3>Professional Links</h3>
                  <div className="links-grid">
                    {formData.website && (
                      <a href={formData.website} target="_blank" rel="noopener noreferrer" className="social-link">
                        <div className="link-icon">🌐</div>
                        <div className="link-info">
                          <div className="link-label">Website</div>
                          <div className="link-url">{formData.website}</div>
                        </div>
                      </a>
                    )}
                    {formData.linkedin && (
                      <a href={formData.linkedin} target="_blank" rel="noopener noreferrer" className="social-link">
                        <div className="link-icon">💼</div>
                        <div className="link-info">
                          <div className="link-label">LinkedIn</div>
                          <div className="link-url">{formData.linkedin}</div>
                        </div>
                      </a>
                    )}
                    {formData.github && (
                      <a href={formData.github} target="_blank" rel="noopener noreferrer" className="social-link">
                        <div className="link-icon">💻</div>
                        <div className="link-info">
                          <div className="link-label">GitHub</div>
                          <div className="link-url">{formData.github}</div>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Skills & Expertise</h2>
              <p>Highlight your technical skills and areas of expertise</p>
            </div>
            
            <div className="skills-section">
              <div className="add-skill-form">
                <form onSubmit={handleAddSkill} className="skill-input-form">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a new skill..."
                    className="skill-input"
                  />
                  <button type="submit" className="btn btn-primary">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Skill
                  </button>
                </form>
              </div>
              
              <div className="skills-grid">
                {skills.map((skill, index) => (
                  <div key={index} className="skill-tag animate-slide-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <span className="skill-name">{skill}</span>
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="skill-remove"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Achievements & Milestones</h2>
              <p>Track your progress and celebrate your accomplishments</p>
            </div>
            
            <div className="achievements-grid">
              {achievements.map((achievement, index) => (
                <div 
                  key={achievement.id} 
                  className={`achievement-card ${achievement.completed ? 'completed' : 'pending'} animate-slide-in-up`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-content">
                    <h3 className="achievement-title">{achievement.title}</h3>
                    <p className="achievement-description">{achievement.description}</p>
                  </div>
                  <div className="achievement-status">
                    {achievement.completed ? (
                      <div className="status-completed">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="status-pending">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;