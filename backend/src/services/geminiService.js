const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Initialize Gemini AI
 */
const initGemini = () => {
  const apiKey = config.gemini.apiKey;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set in environment variables. ' +
      'Get your API key from https://aistudio.google.com/app/apikey'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: config.gemini.model });
};

/**
 * Extract text from an image or PDF using Gemini OCR
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<Object>} - OCR result with extracted text
 */
const extractTextFromDocument = async (filePath, mimeType) => {
  try {
    logger.info(`Starting OCR extraction for: ${filePath}`);
    
    const model = initGemini();

    // Read file as base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // Prompt for intelligent OCR extraction with JSON output
    const prompt = `Analyze this document and extract ONLY meaningful data. Ignore decorative elements, headers, footers, and irrelevant text.

Extract the following information if present:
- Document type (invoice, receipt, form, contract, ID, etc.)
- Key data fields (names, dates, amounts, numbers, addresses, etc.)
- Important values and their labels
- Tables or structured data

Return ONLY a valid JSON object with this structure:
{
  "documentType": "type of document",
  "extractedData": {
    "key1": "value1",
    "key2": "value2"
  },
  "confidence": "high|medium|low"
}

If no meaningful data found, return:
{
  "documentType": "unknown",
  "extractedData": {},
  "confidence": "low"
}

Return ONLY valid JSON, no markdown formatting, no explanations.`;

    logger.debug('Sending request to Gemini API...');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let extractedText = response.text();

    // Clean up markdown code blocks if present
    extractedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(extractedText);
    } catch (parseError) {
      logger.warn('Failed to parse JSON, returning raw text');
      parsedData = {
        documentType: 'unknown',
        extractedData: { rawText: extractedText },
        confidence: 'low',
      };
    }

    logger.info('OCR extraction completed successfully');

    return {
      success: true,
      data: parsedData,
      rawText: extractedText,
      model: config.gemini.model,
    };
  } catch (error) {
    logger.error('OCR extraction failed:', error.message);
    
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in .env file.');
    }
    
    if (error.message.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please check your usage limits.');
    }
    
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
};

/**
 * Extract structured data from a document
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @param {string} schema - Description of expected data structure
 * @returns {Promise<Object>} - Structured data extracted
 */
const extractStructuredData = async (filePath, mimeType, schema) => {
  try {
    logger.info(`Starting structured data extraction for: ${filePath}`);
    
    const model = initGemini();

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const prompt = `Extract structured data from this document.
    ${schema ? `Expected structure: ${schema}` : ''}
    Return the data in JSON format.
    If the document doesn't contain the expected data, return an empty object.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const extractedData = response.text();

    logger.info('Structured data extraction completed');
    
    return {
      success: true,
      data: extractedData,
      model: config.gemini.model,
    };
  } catch (error) {
    logger.error('Structured data extraction failed:', error.message);
    throw new Error(`Structured extraction failed: ${error.message}`);
  }
};

module.exports = {
  extractTextFromDocument,
  extractStructuredData,
};
