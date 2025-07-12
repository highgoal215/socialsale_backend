const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @desc    Send message to chatbot
 * @route   POST /api/chatbot/message
 * @access  Public
 */
const sendMessage = async (req, res) => {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.'
      });
    }

    const { prompt, conversationHistory = [] } = req.body;
    

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a string'
      });
    }

    // Prepare conversation messages
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful and friendly chatbot assistant. Provide clear, concise, and helpful responses.'
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: prompt
      }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    console.log("------------------<>--------------", response)
    res.json({
      success: true,
      data: {
        response,
        conversationId: Date.now().toString(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        success: false,
        error: 'API quota exceeded. Please try again later.'
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key configuration. Please check your OPENAI_API_KEY.'
      });
    }

    // Log more details for debugging
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      type: error.type
    });

    res.status(500).json({
      success: false,
      error: `Failed to process chat message: ${error.message}`
    });
  }
};

/**
 * @desc    Get chatbot status
 * @route   GET /api/chatbot/status
 * @access  Public
 */
const getStatus = async (req, res) => {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Chatbot service is not configured'
      });
    }

    res.json({
      success: true,
      data: {
        status: 'online',
        model: 'gpt-4o-mini',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check chatbot status'
    });
  }
};

module.exports = {
  sendMessage,
  getStatus
}; 