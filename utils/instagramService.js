const axios = require("axios");
const ErrorResponse = require("./errorResponse");

class InstagramService {
  constructor() {
    this.apiUrl =
      process.env.INSTAGRAM_API_URL || "https://api.instagram.com/v1";

    this.useMockData = true;
  }

  /**
   * Get a preview of an Instagram user profile
   * @param {string} username - Instagram username or profile URL
   * @returns {Object} Profile preview data including username, picture, stats, etc.
   */
  async getProfilePreview(usernameOrUrl) {
    try {
      // Extract username from URL if a URL was provided
      const username = this.extractUsernameFromUrl(usernameOrUrl);

      if (!username) {
        throw new ErrorResponse("Invalid Instagram username or URL", 400);
      }

      // Validate the username format
      await this.validateUsername(username);

      // Get user profile data (either from API or mock data)
      const profileData = await this.getUserProfile(username);

      return {
        username: profileData.username,
        id: profileData.id,
        fullName: profileData.fullName,
        profilePicture: profileData.profilePicture,
        isPrivate: profileData.isPrivate,
        statistics: {
          followers: profileData.followersCount,
          following: profileData.followingCount,
          posts: profileData.postCount,
        },
        bio: profileData.biography || "No biography available",
        verified: profileData.isVerified || false,
        profileUrl: `https://instagram.com/${username}`,
      };
    } catch (error) {
      console.error("Error getting profile preview:", error);
      throw new ErrorResponse(
        error.message || "Failed to get Instagram profile preview",
        error.statusCode || 400
      );
    }
  }

  /**
   * Get a preview of an Instagram post
   * @param {string} postUrl - Instagram post URL
   * @returns {Object} Post preview data including image, caption, stats, etc.
   */
  async getPostPreview(postUrl) {
    try {
      // Validate the post URL
      const validationResult = await this.validatePostUrl(postUrl);

      if (!validationResult.valid) {
        throw new ErrorResponse("Invalid Instagram post URL", 400);
      }

      // Get the post details (either from API or mock data)
      const postData = await this.getPostDetails(validationResult.postId);

      // Extract username from the post data or URL
      const username =
        postData.username ||
        this.extractUsernameFromPostUrl(postUrl) ||
        "unknown";

      // Get basic profile info to show alongside the post
      let profileInfo = null;
      try {
        profileInfo = await this.getUserProfile(username);
      } catch (error) {
        console.warn(
          `Couldn't get profile info for post preview: ${error.message}`
        );
      }

      return {
        id: postData.id,
        shortcode: postData.shortcode,
        imageUrl: postData.imageUrl, // Main post image URL
        thumbnailUrl: postData.thumbnailUrl || postData.imageUrl, // Smaller version if available
        caption: postData.caption,
        statistics: {
          likes: postData.likesCount,
          comments: postData.commentsCount,
        },
        timestamp: postData.timestamp,
        author: profileInfo
          ? {
              username: profileInfo.username,
              profilePicture: profileInfo.profilePicture,
              fullName: profileInfo.fullName,
            }
          : {
              username,
            },
        postUrl: postUrl,
      };
    } catch (error) {
      console.error("Error getting post preview:", error);
      throw new ErrorResponse(
        error.message || "Failed to get Instagram post preview",
        error.statusCode || 400
      );
    }
  }

  /**
   * Extract username from an Instagram profile URL
   * @param {string} input - Username or profile URL
   * @returns {string|null} Extracted username or null if invalid
   */
  extractUsernameFromUrl(input) {
    // If it doesn't look like a URL, assume it's just a username so for this it's the logic to remove @
    if (!input.includes("instagram.com") && !input.includes("http")) {
      return input.trim().replace("@", "");
    }

    // Try to extract username from URL using regex like pattern
    try {
      const urlRegex =
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?/;
      const match = input.match(urlRegex);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract username from an Instagram post URL
   * @param {string} postUrl - Instagram post URL
   * @returns {string|null} Extracted username or null if can't be determined
   */
  extractUsernameFromPostUrl(postUrl) {
 
    return null;
  }

  async getUserProfile(username) {
    try {
      // Validate format
      if (!username || typeof username !== "string") {
        throw new ErrorResponse(
          "Username is required and must be a string",
          400
        );
      }

      // Clean up username
      username = username.trim().replace("@", "");

      if (this.useMockData) {
        // Simulating API response delay for mock data
        await new Promise((resolve) => setTimeout(resolve, 300));

        // More detailed mock data with consistent response based on username so that it can be used for testing
        const usernameHash = this.hashCode(username);
        const isVerified =
          ["instagram", "cristiano", "leomessi", "beyonce", "nasa"].includes(
            username.toLowerCase()
          ) || usernameHash % 10 === 0;

        return {
          username,
          id: `user_${usernameHash}`,
          fullName: this.capitalizeUsername(username),
          profilePicture: `https://ui-avatars.com/api/?name=${username}&background=random&size=200`,
          isPrivate: usernameHash % 7 === 0, // Some accounts are private so yeah 
          isVerified: isVerified,
          followersCount: isVerified
            ? 100000 + (usernameHash % 10000000)
            : 100 + (usernameHash % 10000),
          followingCount: 100 + (usernameHash % 1000),
          postCount: 10 + (usernameHash % 200),
          biography: `This is ${this.capitalizeUsername(username)}'s bio. ${
            isVerified ? "Official account." : "Instagram enthusiast."
          } #instagram #social`,
        };
      } else {
        // In production, we would make an actual API call to Instagram or a third-party service
        // Example for a real implementation (commented out as it won't work without proper setup): so for that we'll just throw an error
        /*
        const response = await axios.get(`${this.apiUrl}/users/${username}`, {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        });
        return response.data;
        */

        throw new ErrorResponse("Real API integration is not implemented", 501);
      }
    } catch (error) {
      console.error("Error fetching Instagram profile:", error);
      throw new ErrorResponse(
        error.message ||
          "Error fetching Instagram profile. Please check the username and try again.",
        error.statusCode || 400
      );
    }
  }

  async getPostDetails(postId) {
    try {
      if (this.useMockData) {
        // Simulating API response delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        // More detailed mock data with consistent response based on postId
        const postHash = this.hashCode(postId);
        const isPopularPost = postHash % 10 === 0;

        return {
          id: postId,
          shortcode: postId,
          caption: `${
            isPopularPost
              ? "Amazing sunset today! 🌅 #instagram #nofilter"
              : "Just another day! #instagram"
          } Post ID: ${postId}`,
          imageUrl: `https://picsum.photos/seed/${postHash}/800/800`,
          thumbnailUrl: `https://picsum.photos/seed/${postHash}/400/400`,
          likesCount: isPopularPost
            ? 10000 + (postHash % 50000)
            : 50 + (postHash % 500),
          commentsCount: isPopularPost
            ? 500 + (postHash % 2000)
            : 5 + (postHash % 50),
          timestamp: new Date(
            Date.now() - Math.abs(postHash % 2592000000)
          ).toISOString(), // Within last 30 days
          username: `user_${postHash % 1000}`, // Simulated username, would be real in production
        };
      } else {
        // In production, you would make an actual API call to Instagram or a third-party service
        // Example for a real implementation (commented out as it won't work without proper setup):
        /*
        const response = await axios.get(`${this.apiUrl}/media/${postId}`, {
          headers: { Authorization: `Bearer ${this.apiToken}` }
        });
        return response.data;
        */

        throw new ErrorResponse("Real API integration is not implemented", 501);
      }
    } catch (error) {
      console.error("Error fetching Instagram post details:", error);
      throw new ErrorResponse(
        error.message || "Error fetching post details. Please try again.",
        error.statusCode || 400
      );
    }
  }

  async validateUsername(username) {
    try {
      // Basic validation (remove @ if present)
      username = username.replace('@', '').trim();
      
      // Check format (alphanumeric, underscore, period)
      const regex = /^[a-zA-Z0-9._]{1,30}$/;
      if (!regex.test(username)) {
        throw new ErrorResponse('Invalid Instagram username format', 400);
      }

      // For development, we'll assume all valid format usernames exist
      return { valid: true, username };
    } catch (error) {
      throw new ErrorResponse(error.message || 'Error validating Instagram username', 400);
    }
  }




    /**
   * Get Instagram profile details
   */
    async getProfileDetails(username) {
      try {
        username = username.replace('@', '').trim();
        
        // Check if we have cached profile data
        let profile = await InstagramProfile.findOne({ username });
        
        // If profile exists but is older than 24 hours, fetch new data
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (!profile || profile.lastChecked < oneDayAgo) {
          // In production, you would call a third-party API here
          // For development, we'll generate mock data
          
          const mockData = this.generateMockProfileData(username);
          
          if (profile) {
            // Update existing profile
            profile = await InstagramProfile.findOneAndUpdate(
              { username }, 
              { 
                ...mockData,
                lastChecked: Date.now() 
              },
              { new: true }
            );
          } else {
            // Create new profile
            profile = await InstagramProfile.create({
              username,
              ...mockData,
              lastChecked: Date.now()
            });
          }
        }
        
        return profile;
      } catch (error) {
        throw new ErrorResponse(error.message || 'Error fetching Instagram profile', 400);
      }
    }

    
    
  async validatePostUrl(url) {
    try {
      // More comprehensive regex for Instagram post URLs
      const instagramPostRegex =
        /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/p\/([A-Za-z0-9_-]+)\/?(\?.*)?$/;
      const match = url.match(instagramPostRegex);

      if (!match) {
        throw new ErrorResponse(
          "Invalid Instagram post URL. URL should be in the format: https://www.instagram.com/p/CODE/",
          400
        );
      }

      const postId = match[3];

      return {
        valid: true,
        postId,
        url,
      };
    } catch (error) {
      console.error("Error validating Instagram post URL:", error);
      throw new ErrorResponse(
        error.message ||
          "Invalid Instagram post URL. Please check and try again.",
        error.statusCode || 400
      );
    }
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  capitalizeUsername(username) {
    // Remove non-letter/number characters and capitalize first letter of each word
    return username
      .replace(/[._]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Get Instagram posts for a user
   */
  async getUserPosts(username, limit = 12) {
    try {
      username = username.replace('@', '').trim();

      // In production, you would call a third-party API here
      // For development, we'll generate mock data
      
      // Create mock posts
      const posts = [];
      for (let i = 0; i < limit; i++) {
        const postId = `${username}_post_${i}`;
        posts.push({
          postId,
          postUrl: `https://instagram.com/p/${postId}`,
          imageUrl: `https://picsum.photos/seed/${username}${i}/500/500`,
          caption: `Post ${i+1} by ${username}. #instagram #photo`,
          likesCount: Math.floor(Math.random() * 1000),
          commentsCount: Math.floor(Math.random() * 100),
          timestamp: new Date(Date.now() - i * 86400000)
        });
      }
      
      return posts;
    } catch (error) {
      throw new ErrorResponse(error.message || 'Error fetching Instagram posts', 400);
    }
  }
}

module.exports = new InstagramService();
