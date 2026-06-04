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
 * @param {Object} schema - Schema object with field definitions
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

    // Create a detailed prompt with the schema
    const schemaDescription = schema ? JSON.stringify(schema, null, 2) : '{}';

    const prompt = `Extract data from this document according to the following schema.

SCHEMA:
${schemaDescription}

INSTRUCTIONS:
1. Extract ONLY the fields specified in the schema
2. Return a valid JSON object (not an array, not markdown)
3. Use the exact field names from the schema as keys
4. If a field is not found in the document, omit it or set it to null
5. Return ONLY valid JSON, no markdown code blocks, no explanations

Example output format:
{
  "name": "John Doe",
  "dateOfBirth": "1990-01-01",
  "aadhaarNumber": "1234 5678 9012"
}

Return ONLY the JSON object, nothing else.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let extractedText = response.text();

    logger.debug('Raw Gemini response:', extractedText);

    // Clean up markdown code blocks if present
    extractedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(extractedText);

      // If it's an array with one object, extract the object
      if (Array.isArray(parsedData) && parsedData.length === 1) {
        parsedData = parsedData[0];
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON from Gemini response, returning raw text');
      parsedData = {
        rawText: extractedText,
        parseError: parseError.message,
      };
    }

    logger.info('Structured data extraction completed');

    return {
      success: true,
      data: parsedData,
      model: config.gemini.model,
    };
  } catch (error) {
    logger.error('Structured data extraction failed:', error.message);
    throw new Error(`Structured extraction failed: ${error.message}`);
  }
};

/**
 * Forensic image tampering analysis — visual second-opinion on top of heuristic checks
 * @param {string} filePath - Path to the image file
 * @param {string} mimeType - MIME type of the file
 * @param {Object} heuristicChecks - Results from tamperingService heuristic checks
 * @returns {Promise<Object>} - Gemini's verdict and findings
 */
const analyzeImageForTampering = async (filePath, mimeType, heuristicChecks) => {
  try {
    logger.info(`Starting Gemini tampering analysis for: ${filePath}`);

    const model = initGemini();
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const imagePart = {
      inlineData: { data: base64Data, mimeType },
    };

    const heuristicSummary = JSON.stringify(heuristicChecks, null, 2);

    const prompt = `You are a forensic image analyst. Inspect the attached image for signs of digital tampering or manipulation.

Automated heuristic checks already produced these findings:
${heuristicSummary}

Visually inspect the image and look for:
- Inconsistent shadows, lighting, or reflections
- Misaligned, blurred, or mismatched text (especially in IDs, certificates, or documents)
- Visible cloning, copy-paste, or healing artifacts
- Inconsistent fonts, colors, kerning, or background patterns within the same region
- Edges that suggest a pasted or overlaid element
- Resolution or compression mismatches between regions
- Anything that contradicts or confirms the heuristic findings above

Return ONLY a valid JSON object with this structure:
{
  "verdict": "authentic" | "suspicious" | "likely_tampered",
  "confidence": "low" | "medium" | "high",
  "visualFindings": ["finding 1", "finding 2"],
  "regionsOfConcern": ["description of suspicious region 1"],
  "agreesWithHeuristics": true | false,
  "explanation": "1-2 sentence summary"
}

No markdown, no code blocks, only JSON.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      logger.warn('Failed to parse Gemini tampering response as JSON');
      parsed = {
        verdict: 'unknown',
        confidence: 'low',
        visualFindings: [],
        regionsOfConcern: [],
        agreesWithHeuristics: null,
        explanation: text.slice(0, 500),
        parseError: parseError.message,
      };
    }

    logger.info(`Gemini tampering analysis verdict: ${parsed.verdict}`);

    return {
      success: true,
      ...parsed,
      model: config.gemini.model,
    };
  } catch (error) {
    logger.error('Gemini tampering analysis failed:', error.message);
    return {
      success: false,
      verdict: 'unknown',
      confidence: 'low',
      error: error.message,
    };
  }
};

module.exports = {
  extractTextFromDocument,
  extractStructuredData,
  analyzeImageForTampering,
};
