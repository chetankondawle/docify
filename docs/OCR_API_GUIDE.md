<!-- DOCUMENTATION FILE - DO NOT READ FOR CONTEXT -->

# Gemini OCR API Guide

This guide explains how to use the Gemini 2.0 Flash OCR API for extracting text from images and PDFs.

## Setup

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure API Key

**Option 1: Using .env file (Recommended)**
```bash
# Create .env file in backend directory
cp backend/.env.example backend/.env

# Edit .env and add your API key
GEMINI_API_KEY=your_actual_api_key_here
```

**Option 2: Using environment variable**
```bash
export GEMINI_API_KEY=your_actual_api_key_here
npm run dev:backend
```

**Option 3: Change model (optional)**
```bash
# In .env file, you can specify different Gemini models
GEMINI_MODEL=gemini-2.0-flash-exp  # Default
# or
GEMINI_MODEL=gemini-1.5-flash
# or
GEMINI_MODEL=gemini-1.5-pro
```

## API Endpoints

### 1. Extract OCR from Single Document

**Endpoint:** `POST /api/v1/ocr/extract/:id`

**Description:** Extract all text from a document using Gemini AI.

**Example:**
```bash
curl -X POST http://localhost:5000/api/v1/ocr/extract/1
```

**Response:**
```json
{
  "success": true,
  "message": "OCR extraction completed successfully",
  "data": {
    "documentId": 1,
    "text": "Extracted text from the document...",
    "length": 245,
    "model": "gemini-2.0-flash-exp",
    "cached": false
  }
}
```

**Note:** Results are cached. Subsequent requests return cached data instantly.

---

### 2. Extract Structured Data

**Endpoint:** `POST /api/v1/ocr/structured/:id`

**Description:** Extract structured data (JSON) from documents like invoices, receipts, forms.

**Request Body:**
```json
{
  "schema": "Extract invoice data: invoice_number, date, total_amount, vendor_name, line_items"
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/v1/ocr/structured/1 \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "Extract invoice: number, date, total, vendor"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Structured data extraction completed",
  "data": {
    "documentId": 1,
    "data": "{\"invoice_number\": \"INV-2024-001\", \"date\": \"2024-01-15\", ...}",
    "model": "gemini-2.0-flash-exp"
  }
}
```

---

### 3. Batch Extract OCR

**Endpoint:** `POST /api/v1/ocr/batch`

**Description:** Extract OCR from multiple documents in one request.

**Request Body:**
```json
{
  "documentIds": [1, 2, 3, 4]
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/v1/ocr/batch \
  -H "Content-Type: application/json" \
  -d '{
    "documentIds": [1, 2, 3]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Batch OCR extraction completed",
  "data": {
    "results": [
      { "id": 1, "text": "...", "cached": true },
      { "id": 2, "text": "...", "cached": false },
      { "id": 3, "text": "...", "cached": false }
    ],
    "errors": []
  }
}
```

---

## Supported File Types

- **Images:** JPEG, PNG, GIF, WEBP
- **Documents:** PDF

## Pricing & Limits

### Free Tier (Google AI Studio)
- **15 requests per minute**
- **1,500 requests per day**
- Perfect for development and testing

### Paid Tier (Vertex AI)
- Higher rate limits
- Production-grade SLA
- ~$0.075 per 1M input tokens (very affordable)

## Error Handling

### Invalid API Key
```json
{
  "success": false,
  "message": "Invalid Gemini API key. Please check your GEMINI_API_KEY in .env file."
}
```

### Quota Exceeded
```json
{
  "success": false,
  "message": "Gemini API quota exceeded. Please check your usage limits."
}
```

### Document Not Found
```json
{
  "success": false,
  "message": "Document not found"
}
```

## Best Practices

1. **Cache Results:** OCR results are automatically cached in document metadata
2. **Batch Processing:** Use batch endpoint for multiple documents to save time
3. **Error Recovery:** Handle quota errors gracefully, implement retry logic
4. **Model Selection:** Use `gemini-2.0-flash-exp` for speed, `gemini-1.5-pro` for accuracy

## Testing

1. Upload a document via `/api/v1/documents/upload`
2. Note the document ID from response
3. Call OCR endpoint: `POST /api/v1/ocr/extract/{id}`
4. View extracted text in response

## Example Workflow

```bash
# 1. Upload document
curl -X POST http://localhost:5000/api/v1/documents/upload \
  -F "document=@invoice.jpg"

# Response: { "data": { "id": 5, ... } }

# 2. Extract OCR
curl -X POST http://localhost:5000/api/v1/ocr/extract/5

# 3. Get document with OCR data
curl http://localhost:5000/api/v1/documents/5
```

## Troubleshooting

**Problem:** "GEMINI_API_KEY is not set"
- **Solution:** Add API key to `.env` file and restart server

**Problem:** "API_KEY_INVALID"
- **Solution:** Verify API key at https://aistudio.google.com/app/apikey

**Problem:** Slow OCR extraction
- **Solution:** Switch to `gemini-2.0-flash-exp` model (faster) or use caching

---

For more information, visit [Google Gemini API Documentation](https://ai.google.dev/docs)
