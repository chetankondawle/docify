# Quick Start Guide - Docify

Get started with Docify in 5 minutes. Upload documents and extract structured data using AI-powered OCR.

## Setup (5 minutes)

### 1. Get Your Gemini API Key

1. Visit: **https://aistudio.google.com/app/apikey**
2. Sign in with Google account
3. Click **"Create API Key"**
4. Copy the key

### 2. Configure the API Key

```bash
# Create .env file
cp backend/.env.example backend/.env

# Open backend/.env and add your key:
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Start the Application

```bash
# From project root
npm run dev
```

This starts:
- Backend: **http://localhost:5000**
- Frontend: **http://localhost:5173**

## Using OCR Feature

### Step-by-Step Guide

1. **Open the app**
   - Navigate to: **http://localhost:5173/documents**

2. **Upload a document**
   - Click "Choose File"
   - Select an image (JPG, PNG, GIF, WEBP) or PDF
   - Click "Upload"

3. **Extract OCR Text**
   - Find your uploaded document in the list
   - Click the **"🔍 Extract OCR"** button
   - Wait for extraction (usually 2-5 seconds)
   - View extracted text below the document

4. **Re-extract (Cached)**
   - Click "🔍 Extract OCR" again
   - Results load instantly from cache
   - "Cached" badge appears

## Features

✅ **Instant OCR** - Extract text from images and PDFs
✅ **Visual Results** - View extracted text directly in the UI
✅ **Smart Caching** - Instant results on repeated requests
✅ **Model Info** - See which AI model was used
✅ **Error Handling** - Clear error messages if something goes wrong

## Testing with Sample Documents

### Best Documents to Test:

1. **Screenshots** - Text-heavy screenshots
2. **Receipts** - Shopping receipts with prices
3. **Invoices** - Business invoices
4. **Forms** - Filled forms with data
5. **Book Pages** - Scanned book pages
6. **Handwritten Notes** - (Gemini supports handwriting!)

### What Works Best:

- ✅ Clear, high-resolution images
- ✅ Good contrast (dark text on light background)
- ✅ Straight, non-rotated images
- ✅ Well-lit photos

### What Might Not Work Well:

- ❌ Very blurry images
- ❌ Extremely small text (< 8px)
- ❌ Complex artistic fonts

## API Limits (Free Tier)

- **15 requests per minute**
- **1,500 requests per day**
- **No credit card required**

Perfect for development and testing!

## Troubleshooting

### "Invalid Gemini API key"
- Check that you copied the full API key
- Make sure there are no extra spaces
- Verify `.env` file is in `backend/` directory
- Restart the backend: `npm run dev:backend`

### "Quota exceeded"
- You've hit the free tier limit
- Wait 1 minute (rate limit) or 24 hours (daily limit)
- Or upgrade to paid tier for higher limits

### OCR button not working
- Check browser console (F12) for errors
- Ensure backend is running on port 5000
- Verify document uploaded successfully

### No text extracted
- Document might not contain readable text
- Try a different image with clearer text
- Check image quality and resolution

## Next Steps

Once OCR is working:

1. **Try different document types** - Receipts, invoices, forms
2. **Test batch processing** - Upload multiple documents
3. **Structured extraction** - Use API to extract specific data (invoices, etc.)
4. **Build features** - Search documents by content, export data, etc.

## API Endpoints (for developers)

If you want to use the API directly:

```bash
# Upload document
curl -X POST http://localhost:5000/api/v1/documents/upload \
  -F "document=@myfile.jpg"

# Extract OCR (replace {id} with document ID from upload response)
curl -X POST http://localhost:5000/api/v1/ocr/extract/{id}

# Batch extract
curl -X POST http://localhost:5000/api/v1/ocr/batch \
  -H "Content-Type: application/json" \
  -d '{"documentIds": [1, 2, 3]}'
```

See **`backend/OCR_API_GUIDE.md`** for complete API documentation.

## Support

- **Google AI Studio**: https://aistudio.google.com
- **Gemini API Docs**: https://ai.google.dev/docs
- **Get API Key**: https://aistudio.google.com/app/apikey

---

**That's it! You're ready to extract text from documents using AI! 🚀**
