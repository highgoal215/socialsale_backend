const { OAuth2Client } = require('google-auth-library');

const axios = require('axios');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (token) => {
  try {
    console.log('Verifying Google token...');
    console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('Token length:', token ? token.length : 'undefined');
    console.log('Token starts with:', token ? token.substring(0, 20) + '...' : 'undefined');
    
    // First, try to verify as an ID token
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      console.log('Google ID token verified successfully');
      console.log('User email:', payload.email);
      
      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified
      };
    } catch (idTokenError) {
      console.log('ID token verification failed, trying as access token...');
      
      // If ID token verification fails, try as access token
      try {
        const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const userInfo = response.data;
        console.log('Google access token verified successfully');
        console.log('User email:', userInfo.email);
        
        return {
          googleId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          emailVerified: userInfo.verified_email
        };
      } catch (accessTokenError) {
        console.error('Access token verification failed:', accessTokenError.message);
        throw new Error('Invalid Google token - neither ID token nor access token');
      }
    }
  } catch (error) {
    console.error('Google token verification failed:', error.message);
    console.error('Full error:', error);
    throw new Error('Invalid Google token');
  }
};

module.exports = {
  verifyGoogleToken
}; 