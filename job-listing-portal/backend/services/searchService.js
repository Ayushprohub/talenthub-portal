const JobListing = require('../models/job');
const cacheService = require('./cacheService');

class SearchService {
  /**
   * Search jobs with advanced filtering and sorting
   */
  async searchJobs(criteria, pagination = {}) {
    try {
      // Check cache first
      const cachedResults = cacheService.getCachedSearchResults({ ...criteria, ...pagination });
      if (cachedResults) {
        console.log('Returning cached search results');
        return cachedResults;
      }

      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      const query = this.buildSearchQuery(criteria);
      const sortOptions = this.buildSortOptions(criteria.sortBy, criteria.sortOrder);

      // Build aggregation pipeline for advanced search
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'employerId',
            foreignField: '_id',
            as: 'employer',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  companyName: 1,
                  companySize: 1,
                  industry: 1
                }
              }
            ]
          }
        },
        { $unwind: '$employer' },
        { $sort: sortOptions },
        { $skip: skip },
        { $limit: limit }
      ];

      const jobs = await JobListing.aggregate(pipeline);
      const total = await JobListing.countDocuments(query);

      const results = {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        searchMetadata: {
          hasTextSearch: !!criteria.keywords,
          appliedFilters: this.getAppliedFilters(criteria),
          sortBy: criteria.sortBy || 'relevance'
        }
      };

      // Cache the results
      cacheService.cacheSearchResults({ ...criteria, ...pagination }, results);

      return results;
    } catch (error) {
      console.error('Search service error:', error);
      throw new Error('Failed to search jobs');
    }
  }

  /**
   * Build MongoDB query from search criteria
   */
  buildSearchQuery(criteria) {
    const query = { status: 'published' };

    // Text search across multiple fields with enhanced scoring
    if (criteria.keywords) {
      const keywords = criteria.keywords.trim();
      if (keywords) {
        // Use text search for full-text search capabilities
        query.$text = { 
          $search: keywords,
          $caseSensitive: false
        };
      }
    }

    // Location search - support both single location and multiple locations
    if (criteria.location) {
      const locationRegex = new RegExp(criteria.location, 'i');
      query.$or = [
        { 'location.city': locationRegex },
        { 'location.state': locationRegex },
        { 'location.country': locationRegex },
        { 'locations.city': locationRegex },
        { 'locations.state': locationRegex },
        { 'locations.country': locationRegex }
      ];
    }

    // Remote work options
    if (criteria.remote !== undefined) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'location.remote': criteria.remote },
        { 'locations.remote': criteria.remote }
      );
    }
    if (criteria.hybrid !== undefined) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'location.hybrid': criteria.hybrid },
        { 'locations.hybrid': criteria.hybrid }
      );
    }
    if (criteria.onSite !== undefined) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'location.onSite': criteria.onSite },
        { 'locations.onSite': criteria.onSite }
      );
    }

    // Job type filter
    if (criteria.jobType && criteria.jobType.length > 0) {
      query.jobType = { $in: criteria.jobType };
    }

    // Experience level filter
    if (criteria.experienceLevel && criteria.experienceLevel.length > 0) {
      query.experienceLevel = { $in: criteria.experienceLevel };
    }

    // Salary range filter
    if (criteria.minSalary || criteria.maxSalary) {
      query['salaryRange.showSalary'] = true;
      
      if (criteria.minSalary) {
        query['salaryRange.max'] = { $gte: parseInt(criteria.minSalary) };
      }
      
      if (criteria.maxSalary) {
        query['salaryRange.min'] = { $lte: parseInt(criteria.maxSalary) };
      }
    }

    // Skills filter - enhanced to support partial matching
    if (criteria.skills && criteria.skills.length > 0) {
      query.skills = { 
        $in: criteria.skills.map(skill => new RegExp(skill, 'i')) 
      };
    }

    // Date filters
    if (criteria.postedWithin) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - criteria.postedWithin);
      query.createdAt = { $gte: daysAgo };
    }

    // Company size filter (requires employer profile data)
    if (criteria.companySize && criteria.companySize.length > 0) {
      // This will be handled in the aggregation pipeline
      query._companySizeFilter = criteria.companySize;
    }

    // Industry filter (requires employer profile data)
    if (criteria.industry && criteria.industry.length > 0) {
      // This will be handled in the aggregation pipeline
      query._industryFilter = criteria.industry;
    }

    // Application deadline filter
    if (criteria.hasDeadline !== undefined) {
      if (criteria.hasDeadline) {
        query.applicationDeadline = { $exists: true, $ne: null };
      } else {
        query.$or = [
          { applicationDeadline: { $exists: false } },
          { applicationDeadline: null }
        ];
      }
    }

    // Accepting applications filter
    if (criteria.acceptingApplications !== undefined) {
      query.acceptingApplications = criteria.acceptingApplications;
      if (criteria.acceptingApplications) {
        // Also check that deadline hasn't passed
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { applicationDeadline: { $exists: false } },
            { applicationDeadline: null },
            { applicationDeadline: { $gt: new Date() } }
          ]
        });
      }
    }

    return query;
  }

  /**
   * Build sort options for MongoDB query with enhanced relevance scoring
   */
  buildSortOptions(sortBy = 'relevance', sortOrder = 'desc') {
    const sortOptions = {};
    
    switch (sortBy) {
      case 'relevance':
        // Combine text score with recency and other factors
        sortOptions.score = { $meta: 'textScore' };
        sortOptions.relevanceScore = sortOrder === 'desc' ? -1 : 1;
        sortOptions.createdAt = -1; // Secondary sort by date
        break;
      case 'date':
      case 'createdAt':
        sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'salary':
        sortOptions['salaryRange.max'] = sortOrder === 'desc' ? -1 : 1;
        sortOptions.createdAt = -1; // Secondary sort
        break;
      case 'views':
        sortOptions.viewsCount = sortOrder === 'desc' ? -1 : 1;
        sortOptions.createdAt = -1; // Secondary sort
        break;
      case 'applications':
        sortOptions.applicationsCount = sortOrder === 'desc' ? -1 : 1;
        sortOptions.createdAt = -1; // Secondary sort
        break;
      case 'deadline':
        sortOptions.applicationDeadline = sortOrder === 'desc' ? -1 : 1;
        sortOptions.createdAt = -1; // Secondary sort
        break;
      case 'company':
        sortOptions['employer.companyName'] = sortOrder === 'desc' ? -1 : 1;
        sortOptions.createdAt = -1; // Secondary sort
        break;
      default:
        sortOptions.createdAt = -1;
    }

    return sortOptions;
  }

  /**
   * Calculate relevance score for search results
   */
  calculateRelevanceScore(criteria) {
    const scoreFactors = [];

    // Base text search score
    if (criteria.keywords) {
      scoreFactors.push({ $meta: 'textScore' });
    }

    // Recency boost (newer jobs get higher score)
    scoreFactors.push({
      $multiply: [
        {
          $divide: [
            { $subtract: [new Date(), { $subtract: [new Date(), '$createdAt'] }] },
            1000 * 60 * 60 * 24 * 30 // 30 days in milliseconds
          ]
        },
        0.1 // Weight factor for recency
      ]
    });

    // Application activity boost
    scoreFactors.push({
      $multiply: [
        { $add: ['$applicationsCount', 1] },
        0.05 // Weight factor for application activity
      ]
    });

    // View count boost
    scoreFactors.push({
      $multiply: [
        { $add: ['$viewsCount', 1] },
        0.02 // Weight factor for view activity
      ]
    });

    return scoreFactors.length > 1 ? { $add: scoreFactors } : scoreFactors[0] || 1;
  }

  /**
   * Get list of applied filters for metadata
   */
  getAppliedFilters(criteria) {
    const filters = [];

    if (criteria.keywords) filters.push({ type: 'keywords', value: criteria.keywords });
    if (criteria.location) filters.push({ type: 'location', value: criteria.location });
    if (criteria.jobType && criteria.jobType.length > 0) filters.push({ type: 'jobType', value: criteria.jobType });
    if (criteria.experienceLevel && criteria.experienceLevel.length > 0) filters.push({ type: 'experienceLevel', value: criteria.experienceLevel });
    if (criteria.minSalary || criteria.maxSalary) {
      filters.push({ 
        type: 'salary', 
        value: { min: criteria.minSalary, max: criteria.maxSalary } 
      });
    }
    if (criteria.skills && criteria.skills.length > 0) filters.push({ type: 'skills', value: criteria.skills });
    if (criteria.postedWithin) filters.push({ type: 'postedWithin', value: criteria.postedWithin });
    if (criteria.companySize && criteria.companySize.length > 0) filters.push({ type: 'companySize', value: criteria.companySize });
    if (criteria.industry && criteria.industry.length > 0) filters.push({ type: 'industry', value: criteria.industry });

    return filters;
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(query, limit = 5) {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      // Get suggestions from job titles
      const titleSuggestions = await JobListing.distinct('title', {
        status: 'published',
        title: new RegExp(query, 'i')
      }).limit(limit);

      // Get suggestions from skills
      const skillSuggestions = await JobListing.aggregate([
        { $match: { status: 'published' } },
        { $unwind: '$skills' },
        { $match: { skills: new RegExp(query, 'i') } },
        { $group: { _id: '$skills' } },
        { $limit: limit }
      ]);

      const suggestions = [
        ...titleSuggestions,
        ...skillSuggestions.map(s => s._id)
      ].slice(0, limit);

      return [...new Set(suggestions)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Get related jobs based on a job listing
   */
  async getRelatedJobs(jobId, limit = 5) {
    try {
      const job = await JobListing.findById(jobId);
      if (!job) {
        return [];
      }

      const query = {
        _id: { $ne: jobId },
        status: 'published',
        $or: [
          { employerId: job.employerId }, // Same employer
          { jobType: job.jobType }, // Same job type
          { experienceLevel: job.experienceLevel }, // Same experience level
          { skills: { $in: job.skills } } // Similar skills
        ]
      };

      const relatedJobs = await JobListing.find(query)
        .populate('employerId', 'name email companyName')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return relatedJobs;
    } catch (error) {
      console.error('Error getting related jobs:', error);
      return [];
    }
  }

  /**
   * Index a job for search (placeholder for future search engine integration)
   */
  async indexJob(job) {
    try {
      // For MongoDB text search, indexing is handled automatically
      // This method is a placeholder for future Elasticsearch integration
      console.log(`Job ${job._id} indexed for search`);
      return true;
    } catch (error) {
      console.error('Error indexing job:', error);
      return false;
    }
  }

  /**
   * Remove job from search index
   */
  async removeFromIndex(jobId) {
    try {
      // For MongoDB text search, removal is handled automatically
      // This method is a placeholder for future Elasticsearch integration
      console.log(`Job ${jobId} removed from search index`);
      return true;
    } catch (error) {
      console.error('Error removing job from index:', error);
      return false;
    }
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit = 10) {
    try {
      // This would typically come from search analytics
      // For now, return most common skills and job types
      const popularSkills = await JobListing.aggregate([
        { $match: { status: 'published' } },
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      return popularSkills.map(item => ({
        term: item._id,
        count: item.count,
        type: 'skill'
      }));
    } catch (error) {
      console.error('Error getting popular search terms:', error);
      return [];
    }
  }

  /**
   * Advanced search with complex criteria and faceted results
   */
  async advancedSearch(criteria, pagination = {}) {
    try {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      // Build advanced query with faceted search
      const pipeline = [
        { $match: this.buildSearchQuery(criteria) },
        {
          $lookup: {
            from: 'users',
            localField: 'employerId',
            foreignField: '_id',
            as: 'employer'
          }
        },
        { $unwind: '$employer' },
        {
          $addFields: {
            relevanceScore: this.calculateRelevanceScore(criteria)
          }
        }
      ];

      // Add company size and industry filters if specified
      if (criteria.companySize && criteria.companySize.length > 0) {
        pipeline.push({
          $match: {
            'employer.companySize': { $in: criteria.companySize }
          }
        });
      }

      if (criteria.industry && criteria.industry.length > 0) {
        pipeline.push({
          $match: {
            'employer.industry': { $in: criteria.industry }
          }
        });
      }

      // Get faceted results
      const facetPipeline = [
        ...pipeline,
        {
          $facet: {
            jobs: [
              { $sort: this.buildSortOptions(criteria.sortBy, criteria.sortOrder) },
              { $skip: skip },
              { $limit: limit }
            ],
            facets: [
              {
                $group: {
                  _id: null,
                  jobTypes: { $addToSet: '$jobType' },
                  experienceLevels: { $addToSet: '$experienceLevel' },
                  skills: { $push: '$skills' },
                  locations: { $addToSet: '$location.city' },
                  companies: { $addToSet: '$employer.companyName' },
                  industries: { $addToSet: '$employer.industry' },
                  companySizes: { $addToSet: '$employer.companySize' },
                  salaryRanges: {
                    $push: {
                      min: '$salaryRange.min',
                      max: '$salaryRange.max',
                      period: '$salaryRange.period'
                    }
                  }
                }
              }
            ],
            totalCount: [{ $count: 'count' }]
          }
        }
      ];

      const [result] = await JobListing.aggregate(facetPipeline);
      const jobs = result.jobs || [];
      const facets = result.facets[0] || {};
      const total = result.totalCount[0]?.count || 0;

      // Process facets
      const processedFacets = {
        jobTypes: facets.jobTypes || [],
        experienceLevels: facets.experienceLevels || [],
        skills: [...new Set((facets.skills || []).flat())].slice(0, 20),
        locations: facets.locations?.filter(Boolean) || [],
        companies: facets.companies?.filter(Boolean) || [],
        industries: facets.industries?.filter(Boolean) || [],
        companySizes: facets.companySizes?.filter(Boolean) || [],
        salaryRanges: this.processSalaryRangeFacets(facets.salaryRanges || [])
      };

      return {
        jobs,
        facets: processedFacets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        searchMetadata: {
          hasTextSearch: !!criteria.keywords,
          appliedFilters: this.getAppliedFilters(criteria),
          sortBy: criteria.sortBy || 'relevance'
        }
      };
    } catch (error) {
      console.error('Advanced search error:', error);
      throw new Error('Failed to perform advanced search');
    }
  }

  /**
   * Process salary range facets for better UI display
   */
  processSalaryRangeFacets(salaryRanges) {
    const ranges = salaryRanges
      .filter(range => range.min && range.max)
      .map(range => ({
        min: range.min,
        max: range.max,
        period: range.period
      }));

    // Group by salary ranges
    const buckets = [
      { label: 'Under $50K', min: 0, max: 50000 },
      { label: '$50K - $75K', min: 50000, max: 75000 },
      { label: '$75K - $100K', min: 75000, max: 100000 },
      { label: '$100K - $150K', min: 100000, max: 150000 },
      { label: '$150K+', min: 150000, max: Infinity }
    ];

    return buckets.map(bucket => ({
      ...bucket,
      count: ranges.filter(range => 
        range.min >= bucket.min && range.min < bucket.max
      ).length
    }));
  }

  /**
   * Save search criteria for a user
   */
  async saveSearch(userId, searchCriteria, searchName, notificationSettings = {}) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      const savedSearch = new SavedSearch({
        userId,
        name: searchName,
        criteria: searchCriteria,
        notifications: {
          enabled: notificationSettings.enabled || false,
          frequency: notificationSettings.frequency || 'daily',
          lastNotified: null
        },
        createdAt: new Date(),
        lastUsed: new Date()
      });

      await savedSearch.save();
      return savedSearch;
    } catch (error) {
      console.error('Error saving search:', error);
      throw new Error('Failed to save search criteria');
    }
  }

  /**
   * Get saved searches for a user
   */
  async getSavedSearches(userId, pagination = {}) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      const savedSearches = await SavedSearch.find({ userId })
        .sort({ lastUsed: -1 })
        .skip(skip)
        .limit(limit);

      const total = await SavedSearch.countDocuments({ userId });

      return {
        savedSearches,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting saved searches:', error);
      throw new Error('Failed to get saved searches');
    }
  }

  /**
   * Execute a saved search
   */
  async executeSavedSearch(savedSearchId, userId, pagination = {}) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      const savedSearch = await SavedSearch.findOne({
        _id: savedSearchId,
        userId
      });

      if (!savedSearch) {
        throw new Error('Saved search not found');
      }

      // Update last used timestamp
      savedSearch.lastUsed = new Date();
      await savedSearch.save();

      // Execute the search
      return await this.searchJobs(savedSearch.criteria, pagination);
    } catch (error) {
      console.error('Error executing saved search:', error);
      throw new Error('Failed to execute saved search');
    }
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(savedSearchId, userId) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      const result = await SavedSearch.deleteOne({
        _id: savedSearchId,
        userId
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting saved search:', error);
      throw new Error('Failed to delete saved search');
    }
  }

  /**
   * Update saved search notification settings
   */
  async updateSearchNotifications(savedSearchId, userId, notificationSettings) {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      const savedSearch = await SavedSearch.findOne({
        _id: savedSearchId,
        userId
      });

      if (!savedSearch) {
        throw new Error('Saved search not found');
      }

      savedSearch.notifications = {
        ...savedSearch.notifications,
        ...notificationSettings
      };

      await savedSearch.save();
      return savedSearch;
    } catch (error) {
      console.error('Error updating search notifications:', error);
      throw new Error('Failed to update search notifications');
    }
  }

  /**
   * Check for new job matches for saved searches and send notifications
   */
  async checkSavedSearchMatches() {
    try {
      const SavedSearch = require('../models/SavedSearch');
      
      // Get all saved searches with notifications enabled
      const savedSearches = await SavedSearch.find({
        'notifications.enabled': true
      }).populate('userId', 'email name');

      const notifications = [];

      for (const savedSearch of savedSearches) {
        // Check if it's time to send notification based on frequency
        const shouldNotify = this.shouldSendNotification(savedSearch);
        
        if (shouldNotify) {
          // Get jobs posted since last notification
          const lastNotified = savedSearch.notifications.lastNotified || savedSearch.createdAt;
          const criteria = {
            ...savedSearch.criteria,
            postedSince: lastNotified
          };

          const results = await this.searchJobs(criteria, { limit: 10 });
          
          if (results.jobs.length > 0) {
            notifications.push({
              user: savedSearch.userId,
              searchName: savedSearch.name,
              newJobs: results.jobs,
              totalMatches: results.pagination.total
            });

            // Update last notified timestamp
            savedSearch.notifications.lastNotified = new Date();
            await savedSearch.save();
          }
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error checking saved search matches:', error);
      return [];
    }
  }

  /**
   * Determine if notification should be sent based on frequency
   */
  shouldSendNotification(savedSearch) {
    const { frequency, lastNotified } = savedSearch.notifications;
    const now = new Date();
    
    if (!lastNotified) {
      return true; // First notification
    }

    const timeDiff = now - lastNotified;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    switch (frequency) {
      case 'immediate':
        return true;
      case 'daily':
        return hoursDiff >= 24;
      case 'weekly':
        return hoursDiff >= 168; // 24 * 7
      case 'monthly':
        return hoursDiff >= 720; // 24 * 30
      default:
        return false;
    }
  }
}

module.exports = new SearchService();