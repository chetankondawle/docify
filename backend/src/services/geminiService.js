const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, context) => {
  const maxRetries = config.gemini.maxRetries;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.gemini.timeoutMs);

      try {
        const result = await fn();
        return result;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      const isRetryable = error.message?.includes('quota') ||
        error.message?.includes('rate') ||
        error.message?.includes('timeout') ||
        error.message?.includes('aborted') ||
        error.message?.includes('4') ||
        error.message?.includes('5') ||
        error.message?.includes('network') ||
        error.message?.includes('ECONNRESET') ||
        error.name === 'AbortError';

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 15000);
      logger.warn(`${context} attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
};

const initGemini = () => {
  const apiKey = config.gemini.apiKey;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. ' +
      'Get your API key from https://aistudio.google.com/app/apikey'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: config.gemini.model });
};

const extractTextFromDocument = async (filePath, mimeType) => {
  try {
    logger.info(`Starting OCR extraction for: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ocrFn = async () => {
      const model = initGemini();
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      const imagePart = {
        inlineData: { data: base64Data, mimeType },
      };

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
      extractedText = extractedText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

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

      return { data: parsedData, rawText: extractedText };
    };

    const result = await withRetry(ocrFn, 'OCR extraction');
    logger.info('OCR extraction completed successfully');

    return {
      success: true,
      data: result.data,
      rawText: result.rawText,
      model: config.gemini.model,
    };
  } catch (error) {
    logger.error('OCR extraction failed:', error.message);

    if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in .env file.');
    }

    if (error.message.includes('quota') || error.message.includes('429')) {
      throw new Error('Gemini API quota exceeded. Please check your usage limits or try again later.');
    }

    if (error.message.includes('timed out') || error.message.includes('aborted')) {
      throw new Error('OCR extraction timed out. The document may be too large or the service is slow.');
    }

    throw new Error(`OCR extraction failed: ${error.message}`);
  }
};

const extractStructuredData = async (filePath, mimeType, schema) => {
  try {
    logger.info(`Starting structured data extraction for: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const extractFn = async () => {
      const model = initGemini();
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      const imagePart = {
        inlineData: { data: base64Data, mimeType },
      };

      const schemaDescription = schema ? JSON.stringify(schema, null, 2) : '{}';

      const prompt = `You are a document verification and data extraction system.

STEP 1 — Identify the document type:
Examine the document and determine what type of document it is (e.g., Aadhaar Card, PAN Card, Passport, Salary Slip, Invoice, Receipt, etc.).

STEP 2 — Verify it matches the expected type:
The expected document type is: ${schema ? 'a document matching the schema below' : 'any document'}

STEP 3 — Extract the fields:
If the document type matches what is expected, extract the fields specified in this schema:
${schemaDescription}

Return a valid JSON object with this structure:
{
  "detectedDocumentType": "the actual document type you identified (e.g., aadhaar_card, pan_card, passport, salary_slip, invoice, receipt, unknown)",
  "typeMatch": true or false (true if the document matches the expected type),
  "extractedData": {
    ...fields from the schema that were found in the document
  },
  "missingFields": ["list", "of", "schema", "fields", "not", "found"],
  "confidence": "high|medium|low"
}

Rules:
- Only return JSON, no markdown, no explanations
- Use null for fields not found in the document
- detectedDocumentType must be lowercase with underscores
- typeMatch must be false if the document is clearly a different type
- If you cannot determine the document type, use "unknown"`;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let extractedText = response.text();
      extractedText = extractedText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

      let parsedData;
      try {
        parsedData = JSON.parse(extractedText);
        if (Array.isArray(parsedData) && parsedData.length === 1) {
          parsedData = parsedData[0];
        }

        if (!parsedData.detectedDocumentType) {
          const extractedOnly = parsedData.extractedData || parsedData;
          const fieldsFromData = Object.keys(extractedOnly).filter(k => k !== 'rawText');
          parsedData = {
            detectedDocumentType: fieldsFromData.length > 0 ? 'unknown' : 'unknown',
            typeMatch: null,
            extractedData: extractedOnly,
            missingFields: [],
            confidence: 'low',
          };
        }

        if (parsedData.extractedData && typeof parsedData.extractedData === 'object') {
          const dataWithoutMeta = {};
          for (const [key, val] of Object.entries(parsedData.extractedData)) {
            if (!['detectedDocumentType', 'typeMatch', 'extractedData', 'missingFields', 'confidence', 'rawText', 'parseError'].includes(key)) {
              dataWithoutMeta[key] = val;
            }
          }
          parsedData.extractedData = dataWithoutMeta;
        }
      } catch (parseError) {
        logger.warn('Failed to parse JSON from Gemini response, returning raw text');
        parsedData = {
          detectedDocumentType: 'unknown',
          typeMatch: null,
          extractedData: {},
          missingFields: [],
          confidence: 'low',
          rawText: extractedText,
          parseError: parseError.message,
        };
      }

      return { data: parsedData };
    };

    const result = await withRetry(extractFn, 'Structured extraction');
    logger.info('Structured data extraction completed');

    return {
      success: true,
      data: result.data,
      model: config.gemini.model,
    };
  } catch (error) {
    logger.error('Structured data extraction failed:', error.message);
    throw new Error(`Structured extraction failed: ${error.message}`);
  }
};

const analyzeImageForTampering = async (filePath, mimeType, heuristicChecks) => {
  try {
    logger.info(`Starting Gemini tampering analysis for: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const analyzeFn = async () => {
      const model = initGemini();
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      const imagePart = {
        inlineData: { data: base64Data, mimeType },
      };

      const heuristicSummary = JSON.stringify(heuristicChecks, null, 2);

      const prompt = `You are checking an image for signs of editing and AI generation. Look at the image and the automated checks below, then give a short, plain-language verdict.

Automated checks:
${heuristicSummary}

Write for a non-technical reader. Be brief and direct.

IMPORTANT — Also look for these AI/deepfake indicators specifically:
- Unnatural smooth skin or faces with no texture
- Asymmetric eyes, ears, or facial features
- Garbled or distorted text (letters that don't form real words)
- Inconsistent shadows or lighting across the image
- Anatomical errors (extra fingers, misshapen hands, weird teeth)
- Overly perfect or artificial-looking backgrounds
- Inconsistent reflections in glasses, windows, or shiny surfaces

Rules for your response:
- "explanation": ONE sentence, max 20 words, plain English. No jargon (avoid "artifacts", "ELA", "EXIF", "compression", "kerning"). Say what you see, not how you checked.
- "visualFindings": up to 3 items. Each item max 10 words. Plain English. Only include things you can actually see in the image. Empty array if nothing notable.
- "regionsOfConcern": up to 2 items. Each item max 8 words, naming where in the image (e.g. "photo area", "name field", "bottom-right corner"). Empty array if none.
- "verdict": one of "authentic", "suspicious", "likely_tampered", "ai_generated".
- "confidence": one of "low", "medium", "high".
- "agreesWithHeuristics": true or false.
- "aiGenerationIndicators": list any AI/deepfake signs you see (max 2 items, 10 words each). Empty array if none.

Examples of good explanations:
- "Image looks original with no visible edits or AI signs."
- "The name field looks pasted in — different sharpness than the rest."
- "Face is unnaturally smooth with garbled text — likely AI generated."
- "Photo and text don't match in lighting; likely edited."

Return ONLY this JSON, no markdown, no code blocks:
{
  "verdict": "authentic" | "suspicious" | "likely_tampered" | "ai_generated",
  "confidence": "low" | "medium" | "high",
  "visualFindings": [],
  "regionsOfConcern": [],
  "aiGenerationIndicators": [],
  "agreesWithHeuristics": true | false,
  "explanation": ""
}`;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

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

      return { ...parsed };
    };

    const result = await withRetry(analyzeFn, 'Tampering analysis');
    logger.info(`Gemini tampering analysis verdict: ${result.verdict}`);

    return {
      success: true,
      ...result,
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

/**
 * Side-by-side comparison of a target document against reference sample images.
 * Sends target + up to 3 reference images to Gemini for forensic document comparison.
 */
const compareDocumentWithReference = async (targetPath, referencePaths, mimeType, documentType) => {
  try {
    logger.info(`Starting reference comparison for ${documentType}: ${targetPath}`);

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Target file not found: ${targetPath}`);
    }

    const compareFn = async () => {
      const model = initGemini();
      const targetBuffer = fs.readFileSync(targetPath);
      const targetBase64 = targetBuffer.toString('base64');

      const imageParts = [
        { inlineData: { data: targetBase64, mimeType } },
      ];

      const refsToSend = referencePaths.slice(0, 3).filter(p => fs.existsSync(p));
      for (const refPath of refsToSend) {
        const refBuffer = fs.readFileSync(refPath);
        imageParts.push({
          inlineData: { data: refBuffer.toString('base64'), mimeType },
        });
      }

      const aspectChecks = documentType === 'AADHAAR_CARD'
        ? `1. Layout: Do field positions (Name, DOB, Gender, Aadhaar Number, Address) match the reference?
2. Government Emblem: Is the Ashoka Chakra / government emblem present and correctly positioned at the top?
3. QR Code: Is there a QR code in the expected region (bottom-right)?
4. Text Fields: Are text labels correctly placed (English on top, Hindi below)?
5. Font: Does the font style and weight match the reference?
6. Aadhaar Number Format: Does the number follow XXXX XXXX XXXX pattern?
7. Dotted Borders: Are the dotted envelope borders present and correctly formed?
8. Photo Area: Is there a photo area in the expected position (left side)?`
        : `1. Layout: Does the overall layout match the reference?
2. Logos/Seals: Are official logos, seals, or stamps present and correctly positioned?
3. Text Fields: Are key fields in the expected positions?
4. Font: Does the font style match the reference?
5. Format: Do numbers/dates follow the expected format?`;

      const prompt = `You are a forensic document examiner. Compare the FIRST image (the TARGET document) against the REMAINING images (reference samples of a genuine ${documentType.replace('_', ' ')}).

The references are known genuine samples. Your job is to determine if the target matches them or shows signs of tampering.

Analyze these specific aspects:

${aspectChecks}

Rules for your response:
- "similarityScore": number 0-100. 100 = perfect match with reference.
- "aspects": evaluate each aspect above as match=true/false with a short note (max 15 words each)
- "discrepancies": list specific differences found between target and references (max 5 items, 15 words each). Empty array if none.
- "verdict": one of "authentic", "suspicious", "likely_tampered"
- "confidence": one of "low", "medium", "high"
- "explanation": one sentence, max 20 words, plain English

Return ONLY this JSON:
{
  "similarityScore": 0-100,
  "aspects": {
    "layout": { "match": true, "notes": "" },
    "emblem": { "match": true, "notes": "" },
    "qrCode": { "match": true, "notes": "" },
    "textFields": { "match": true, "notes": "" },
    "font": { "match": true, "notes": "" },
    "aadhaarFormat": { "match": true, "notes": "" },
    "borders": { "match": true, "notes": "" },
    "photoArea": { "match": true, "notes": "" }
  },
  "discrepancies": [],
  "verdict": "authentic",
  "confidence": "high",
  "explanation": ""
}`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        logger.warn('Failed to parse Gemini reference comparison as JSON');
        parsed = {
          similarityScore: 0,
          aspects: {},
          discrepancies: [],
          verdict: 'unknown',
          confidence: 'low',
          explanation: text.slice(0, 500),
          parseError: parseError.message,
        };
      }

      return parsed;
    };

    const result = await withRetry(compareFn, 'Reference comparison');
    logger.info(`Reference comparison verdict: ${result.verdict} (${result.similarityScore}% similar)`);

    return {
      success: true,
      referenceCount: referencePaths.length,
      ...result,
      model: config.gemini.model,
    };
  } catch (error) {
    logger.error('Reference comparison failed:', error.message);
    return {
      success: false,
      similarityScore: 0,
      aspects: {},
      discrepancies: [],
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
  compareDocumentWithReference,
};
