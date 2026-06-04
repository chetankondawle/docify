const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const { ExifTool } = require('exiftool-vendored');
const sharp = require('sharp');
const logger = require('../utils/logger');
const geminiService = require('./geminiService');
const { getReferenceFiles } = require('../utils/fileHelpers');

/**
 * Perform comprehensive PDF tampering checks
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} - Tampering check results
 */
const checkPDFTampering = async (filePath, documentType = null) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfContent = dataBuffer.toString('latin1');

    const checks = {
      digitalSignature: checkDigitalSignature(pdfContent),
      incrementalUpdates: checkIncrementalUpdates(pdfContent),
      metadataConsistency: await checkMetadataConsistency(filePath),
      embeddedFiles: checkEmbeddedFiles(pdfContent),
      javaScriptDetection: checkJavaScript(pdfContent),
      eofValidation: checkEOFMarker(pdfContent),
      encryptionStatus: checkEncryption(pdfContent),
      versionConsistency: checkPDFVersion(pdfContent),
      xrefTableValidation: checkXRefTable(pdfContent),
      fontSubstitution: checkFontSubstitution(pdfContent),
    };

    const riskScore = calculateRiskScore(checks);

    const result = {
      safe: riskScore < 30,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      checks,
      summary: generateSummary(checks, riskScore),
      referenceComparison: null,
    };

    if (documentType) {
      const referencePaths = getReferenceFiles(documentType);
      if (referencePaths.length > 0) {
        result.referenceComparison = await runReferenceComparison(
          filePath, referencePaths, 'application/pdf', documentType
        );
      }
    }

    return result;
  } catch (error) {
    logger.error('PDF tampering check failed:', error.message);
    throw new Error(`PDF tampering check failed: ${error.message}`);
  }
};

/**
 * Check for digital signatures
 */
const checkDigitalSignature = (content) => {
  const hasSig = /\/Type\s*\/Sig/.test(content);
  const hasAcroForm = /\/AcroForm/.test(content);

  return {
    passed: hasSig,
    hasSig,
    hasAcroForm,
    message: hasSig ? 'Digital signature found' : 'No digital signature',
    risk: hasSig ? 0 : 5,
  };
};

/**
 * Check for suspicious incremental updates
 */
const checkIncrementalUpdates = (content) => {
  const xrefMatches = content.match(/xref/g) || [];
  const updateCount = xrefMatches.length - 1;
  const suspicious = updateCount > 3;

  return {
    passed: !suspicious,
    updateCount,
    suspicious,
    message: suspicious
      ? `Suspicious: ${updateCount} incremental updates found`
      : `${updateCount} incremental updates (normal)`,
    risk: suspicious ? 20 : updateCount * 2,
  };
};

/**
 * Check metadata consistency
 */
const checkMetadataConsistency = async (filePath) => {
  try {
    const data = new PDFParse({url:filePath});
    const info = await data.getInfo();
    const creationDate = extractDate(info.info.CreationDate);
    const modDate = extractDate(info.info.ModDate);
    const inconsistent = modDate && creationDate && modDate < creationDate;

    return {
      passed: !inconsistent,
      creationDate: creationDate.toISOString() || 'Unknown',
      modificationDate: modDate.toISOString() || 'Unknown',
      producer: info.info.Producer || 'Unknown',
      inconsistent,
      message: inconsistent
        ? 'Modification date before creation date (suspicious)'
        : 'Metadata dates consistent',
      risk: inconsistent ? 25 : 0,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to parse metadata',
      risk: 10,
    };
  }
};

/**
 * Check for embedded files
 */
const checkEmbeddedFiles = (content) => {
  const hasEmbedded = /\/EmbeddedFile/.test(content);
  const hasFileAttachment = /\/FileAttachment/.test(content);
  const hasEmbeddedFiles = hasEmbedded || hasFileAttachment;

  return {
    passed: !hasEmbeddedFiles,
    hasEmbeddedFiles,
    message: hasEmbeddedFiles
      ? 'Warning: Embedded files detected'
      : 'No embedded files',
    risk: hasEmbeddedFiles ? 15 : 0,
  };
};

/**
 * Check for JavaScript or suspicious actions
 */
const checkJavaScript = (content) => {
  const hasJS = /\/JavaScript/.test(content);
  const hasOpenAction = /\/OpenAction/.test(content);
  const hasAA = /\/AA/.test(content); // Additional Actions
  const hasLaunch = /\/Launch/.test(content);
  const hasURI = /\/URI/.test(content);

  const suspicious = hasJS || hasOpenAction || hasAA || hasLaunch;

  return {
    passed: !suspicious,
    hasJavaScript: hasJS,
    hasOpenAction,
    hasAdditionalActions: hasAA,
    hasLaunchAction: hasLaunch,
    hasURI,
    message: suspicious
      ? 'Warning: Suspicious actions/JavaScript detected'
      : 'No suspicious actions',
    risk: (hasJS ? 20 : 0) + (hasOpenAction ? 15 : 0) + (hasAA ? 10 : 0) + (hasLaunch ? 25 : 0),
  };
};


/**
 * Check encryption status
 */
const checkEncryption = (content) => {
  const hasEncrypt = /\/Encrypt/.test(content);
  const hasFilter = /\/Filter/.test(content);

  return {
    passed: true, // Encryption itself is not suspicious
    isEncrypted: hasEncrypt,
    hasFilter,
    message: hasEncrypt ? 'PDF is encrypted' : 'PDF is not encrypted',
    risk: 0,
  };
};

/**
 * Check PDF version consistency
 */
const checkPDFVersion = (content) => {
  const versionMatch = content.match(/%PDF-(\d+\.\d+)/);
  const version = versionMatch ? versionMatch[1] : 'Unknown';
  const catalogVersion = content.match(/\/Version\s*\/(\d+\.\d+)/);

  const inconsistent = catalogVersion && catalogVersion[1] !== version;

  return {
    passed: !inconsistent,
    headerVersion: version,
    catalogVersion: catalogVersion ? catalogVersion[1] : null,
    inconsistent,
    message: inconsistent
      ? 'Version mismatch between header and catalog'
      : `PDF version ${version}`,
    risk: inconsistent ? 15 : 0,
  };
};

/**
 * Calculate overall risk score (0-100)
 */
const calculateRiskScore = (checks) => {
  return Object.values(checks).reduce((total, check) => total + (check.risk || 0), 0);
};

/**
 * Get risk level based on score
 */
const getRiskLevel = (score) => {
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
};

/**
 * Check cross-reference table validity
 */
const checkXRefTable = (content) => {
  try {
    // Extract xref entries
    const xrefSections = [];
    const xrefRegex = /xref\s+(\d+)\s+(\d+)\s+([\s\S]*?)(?=trailer|xref|endobj|$)/g;
    let match;

    while ((match = xrefRegex.exec(content)) !== null) {
      const startObj = parseInt(match[1], 10);
      const count = parseInt(match[2], 10);
      const entries = match[3].trim().split('\n');

      xrefSections.push({ startObj, count, entries: entries.length });
    }

    // Extract actual object definitions
    const objectRegex = /(\d+)\s+\d+\s+obj/g;
    const actualObjects = [];
    while ((match = objectRegex.exec(content)) !== null) {
      actualObjects.push(parseInt(match[1], 10));
    }

    // Check for duplicates
    const duplicates = actualObjects.filter((item, index) => actualObjects.indexOf(item) !== index);
    const hasDuplicates = duplicates.length > 0;

    // Calculate discrepancies
    const totalXrefEntries = xrefSections.reduce((sum, section) => sum + section.count, 0);
    const actualObjectCount = new Set(actualObjects).size;
    const hasDiscrepancy = Math.abs(totalXrefEntries - actualObjectCount) > 5; // Allow small variance

    const suspicious = hasDuplicates || hasDiscrepancy;

    return {
      passed: !suspicious,
      xrefSections: xrefSections.length,
      totalXrefEntries,
      actualObjectCount,
      duplicateObjects: duplicates.length,
      hasDiscrepancy,
      message: suspicious
        ? `xref table issues: ${hasDuplicates ? `${duplicates.length} duplicate objects` : ''} ${hasDiscrepancy ? 'object count mismatch' : ''}`
        : 'xref table appears valid',
      risk: (hasDuplicates ? 20 : 0) + (hasDiscrepancy ? 15 : 0),
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to validate xref table',
      risk: 10,
    };
  }
};

/**
 * Check for font substitution
 */
const checkFontSubstitution = (content) => {
  try {
    // Extract font declarations
    const fontRegex = /\/Type\s*\/Font[\s\S]*?(?=\/Type\s*\/|endobj)/g;
    const fonts = content.match(fontRegex) || [];

    let declaredFonts = 0;
    let embeddedFonts = 0;
    let substitutedFonts = 0;
    let suspiciousFonts = 0;

    fonts.forEach((font) => {
      declaredFonts++;

      // Check if font has BaseFont declaration
      const hasBaseFont = /\/BaseFont/.test(font);

      // Check if font is actually embedded
      const hasFontDescriptor = /\/FontDescriptor/.test(font);
      const hasFontFile = /\/FontFile[123]?/.test(font);
      const isEmbedded = hasFontDescriptor && hasFontFile;

      if (isEmbedded) {
        embeddedFonts++;
      } else if (hasBaseFont && !isEmbedded) {
        // Font declared but not embedded - likely substituted
        substitutedFonts++;
      }

      // Check for Type1 fonts without descriptors (suspicious)
      const isType1 = /\/Subtype\s*\/Type1/.test(font);
      if (isType1 && !hasFontDescriptor) {
        suspiciousFonts++;
      }
    });

    const suspicious = substitutedFonts > 0 || suspiciousFonts > 0;
    const substitutionRatio = declaredFonts > 0 ? (substitutedFonts / declaredFonts) : 0;

    return {
      passed: !suspicious,
      declaredFonts,
      embeddedFonts,
      substitutedFonts,
      suspiciousFonts,
      substitutionRatio: Math.round(substitutionRatio * 100),
      message: suspicious
        ? `Font issues: ${substitutedFonts} substituted, ${suspiciousFonts} suspicious fonts`
        : `All ${declaredFonts} fonts appear valid (${embeddedFonts} embedded)`,
      risk: (substitutedFonts * 10) + (suspiciousFonts * 15),
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to analyze fonts',
      risk: 5,
    };
  }
};

/**
 * Generate human-readable summary
 */
const generateSummary = (checks, riskScore) => {
  const warnings = [];

  if (checks.javaScriptDetection.hasJavaScript) warnings.push('Contains JavaScript');
  if (checks.javaScriptDetection.hasLaunchAction) warnings.push('Has launch actions');
  if (checks.embeddedFiles.hasEmbeddedFiles) warnings.push('Contains embedded files');
  if (checks.incrementalUpdates.suspicious) warnings.push('Multiple incremental updates');
  if (checks.metadataConsistency.inconsistent) warnings.push('Metadata inconsistency');
  if (checks.eofValidation.dataAfterEOF) warnings.push('Data after EOF');
  if (checks.xrefTableValidation && !checks.xrefTableValidation.passed) warnings.push('xref table issues');
  if (checks.fontSubstitution && checks.fontSubstitution.substitutedFonts > 0) warnings.push('Font substitution detected');

  if (warnings.length === 0) {
    return 'PDF appears safe with no suspicious indicators';
  }

  return `Risk level ${getRiskLevel(riskScore)}: ${warnings.join(', ')}`;
};

/**
 * Extract date from PDF date string
 */
const extractDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (match) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`);
    }
  } catch (error) {
    return null;
  }
  return null;
};

/**
 * Check EOF marker validity
 */
const checkEOFMarker = (content) => {
  const hasEOF = /%%EOF\s*$/.test(content.trim());
  const dataAfterEOF = !hasEOF && content.includes('%%EOF');

  return {
    passed: hasEOF,
    hasValidEOF: hasEOF,
    dataAfterEOF,
    message: dataAfterEOF
      ? 'Warning: Data found after EOF marker'
      : hasEOF ? 'Valid EOF marker' : 'Missing EOF marker',
    risk: dataAfterEOF ? 20 : (!hasEOF ? 10 : 0),
  };
};


/**
 * Perform comprehensive image tampering checks
 * @param {string} filePath - Path to image file
 * @param {string} mimeType - Declared MIME type (e.g., 'image/jpeg', 'image/png')
 * @returns {Promise<Object>} - Tampering check results
 */
const checkImageTampering = async (filePath, mimeType, documentType = null) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const format = detectImageFormat(buffer);

    const checks = {
      fileSignature: checkImageFileSignature(buffer, mimeType, format),
      softwareFingerprint: checkSoftwareFingerprint(buffer),
      exifMetadata: await checkExifMetadata(filePath, format),
      errorLevelAnalysis: await checkErrorLevelAnalysis(filePath, format),
      trailingData: checkImageTrailingData(buffer, format),
      multipleImages: checkMultipleImages(buffer, format),
      commentChunks: checkCommentChunks(buffer, format),
      structuralIntegrity: checkImageStructuralIntegrity(buffer, format),
      thumbnailPresence: checkThumbnailPresence(buffer, format),
      aiGenerationMarkers: checkAIGenerationMarkers(buffer, format),
    };

    const riskScore = calculateRiskScore(checks);

    const result = {
      safe: riskScore < 30,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      format,
      checks,
      summary: null,
      referenceComparison: null,
    };

    // Reference-based comparison — auto-detected by documentType
    if (documentType) {
      const referencePaths = getReferenceFiles(documentType);
      if (referencePaths.length > 0) {
        const docConfig = { AADHAAR_CARD: { name: 'Aadhaar Card' } }[documentType] || null;
        if (docConfig) {
          result.referenceComparison = await runReferenceComparison(
            filePath, referencePaths, mimeType, documentType
          );
        }
      }
    }

    result.summary = generateImageSummary(checks, riskScore, result.referenceComparison);

    return result;
  } catch (error) {
    logger.error('Image tampering check failed:', error.message);
    throw new Error(`Image tampering check failed: ${error.message}`);
  }
};

/**
 * Detect image format from magic bytes
 */
const detectImageFormat = (buffer) => {
  if (buffer.length < 12) return 'unknown';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpeg';
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) return 'png';
  const head6 = buffer.slice(0, 6).toString('ascii');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'gif';
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'bmp';
  if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) ||
      (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A)) return 'tiff';
  return 'unknown';
};

/**
 * Check that file signature matches declared MIME type
 */
const checkImageFileSignature = (buffer, mimeType, format) => {
  const mimeMap = {
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpeg',
    'image/pjpeg': 'jpeg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
  };
  const expected = mimeMap[mimeType] || null;
  const mismatch = expected !== null && expected !== format;
  const unknown = format === 'unknown';

  return {
    passed: !mismatch && !unknown,
    declaredMimeType: mimeType,
    detectedFormat: format,
    mismatch,
    message: unknown
      ? 'Unknown image format (invalid signature)'
      : mismatch
        ? `Signature mismatch: declared ${mimeType}, detected ${format}`
        : `Valid ${format.toUpperCase()} signature`,
    risk: unknown ? 25 : mismatch ? 30 : 0,
  };
};

/**
 * Detect editing software signatures embedded in metadata
 */
const checkSoftwareFingerprint = (buffer) => {
  const content = buffer.toString('latin1');
  const signatures = [
    // Traditional editors
    { name: 'Adobe Photoshop', regex: /Adobe Photoshop/i, weight: 15 },
    { name: 'Adobe Lightroom', regex: /Adobe Lightroom/i, weight: 10 },
    { name: 'Adobe Illustrator', regex: /Adobe Illustrator/i, weight: 15 },
    { name: 'GIMP', regex: /GIMP/i, weight: 15 },
    { name: 'Paint.NET', regex: /Paint\.NET/i, weight: 15 },
    { name: 'Pixelmator', regex: /Pixelmator/i, weight: 15 },
    { name: 'Affinity Photo', regex: /Affinity Photo/i, weight: 15 },
    { name: 'ImageMagick', regex: /ImageMagick/i, weight: 10 },
    { name: 'PaintShop', regex: /Paint Shop|PaintShop/i, weight: 15 },
    { name: 'Canva', regex: /Canva/i, weight: 10 },
    // AI generation tools
    { name: 'Midjourney', regex: /Midjourney/i, weight: 40 },
    { name: 'DALL-E', regex: /DALL.E|OpenAI/i, weight: 40 },
    { name: 'Stable Diffusion', regex: /Stable.?Diffusion|Stability.?AI/i, weight: 40 },
    { name: 'Adobe Firefly', regex: /Firefly|Adobe.?Firefly/i, weight: 35 },
    { name: 'Leonardo AI', regex: /Leonardo.?AI/i, weight: 35 },
    { name: 'DreamStudio', regex: /DreamStudio/i, weight: 35 },
    { name: 'ComfyUI', regex: /ComfyUI/i, weight: 35 },
  ];

  const detected = signatures.filter((s) => s.regex.test(content)).map((s) => s.name);
  const risk = signatures.reduce((sum, s) => sum + (s.regex.test(content) ? s.weight : 0), 0);
  const suspicious = detected.length > 0;

  return {
    passed: !suspicious,
    detectedSoftware: detected,
    message: suspicious
      ? `Image edited with: ${detected.join(', ')}`
      : 'No editing software signatures detected',
    risk: Math.min(risk, 50),
  };
};

// Singleton ExifTool instance — reuse across calls to avoid spawning a process per check
let _exiftool = null;
const getExifTool = () => {
  if (!_exiftool) _exiftool = new ExifTool();
  return _exiftool;
};

// Cleanup on exit
process.on('exit', () => { if (_exiftool) _exiftool.end().catch(() => {}); });

/**
 * Check EXIF metadata presence and date consistency (JPEG, PNG, WebP, TIFF)
 */
const checkExifMetadata = async (filePath, format) => {
  const exifFormats = ['jpeg', 'png', 'webp', 'tiff'];

  if (!exifFormats.includes(format)) {
    return {
      passed: true,
      hasExif: false,
      message: `EXIF not applicable for ${format}`,
      risk: 0,
    };
  }

  let tags;
  try {
    const et = getExifTool();
    tags = await et.read(filePath);
  } catch (error) {
    return {
      passed: false,
      hasExif: false,
      message: `EXIF parse failed: ${error.message}`,
      risk: 5,
    };
  }

  // ExifTool always returns filesystem/infrastructure tags for any file.
  // Anything beyond these indicates real metadata/EXIF presence.
  const alwaysPresentTags = [
    'SourceFile', 'ExifToolVersion', 'FileName', 'Directory', 'FileSize',
    'FileModifyDate', 'FileAccessDate', 'FileInodeChangeDate', 'FilePermissions',
    'errors', 'warnings'
  ];
  const userTags = Object.keys(tags).filter(k => !alwaysPresentTags.includes(k));
  const hasExif = userTags.length > 0;

  if (!hasExif) {
    return {
      passed: false,
      hasExif: false,
      message: 'No EXIF metadata (possibly stripped during editing)',
      risk: 10,
    };
  }

  const software = tags.Software || null;
  const make = tags.Make || null;
  const model = tags.Model || null;

  // ExifTool returns ExifDateTime objects with a rawValue string like "2024:01:01 12:00:00"
  const parseExifDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    const raw = val.rawValue || val;
    if (typeof raw === 'string') {
      const m = raw.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
    }
    return null;
  };

  const dateTimeOriginal = parseExifDate(tags.DateTimeOriginal);
  const modifyDate = parseExifDate(tags.ModifyDate);
  const createDate = parseExifDate(tags.CreateDate);
  const hasGPS = !!(tags.GPSLatitude || tags.GPSLongitude);

  const editorPatterns = /Photoshop|GIMP|Lightroom|Paint|Pixelmator|Affinity|Canva|ImageMagick|Snapseed|Picsa/i;
  const editedBySoftware = software && editorPatterns.test(software);

  let dateInconsistent = false;
  let dateDiffSeconds = 0;
  if (dateTimeOriginal && modifyDate) {
    dateDiffSeconds = Math.abs((modifyDate - dateTimeOriginal) / 1000);
    dateInconsistent = dateDiffSeconds > 300;
  }

  const missingCameraInfo = !make && !model;

  let risk = 0;
  if (editedBySoftware) risk += 20;
  if (dateInconsistent) risk += 15;
  if (missingCameraInfo) risk += 5;

  const messages = [];
  if (editedBySoftware) messages.push(`Software: ${software}`);
  if (dateInconsistent) messages.push(`Modified ${Math.round(dateDiffSeconds / 60)}min after capture`);
  if (missingCameraInfo) messages.push('No camera Make/Model');
  if (messages.length === 0) messages.push(`EXIF valid${make ? ` (${make}${model ? ` ${model}` : ''})` : ''}`);

  return {
    passed: !editedBySoftware && !dateInconsistent,
    hasExif: true,
    software,
    make,
    model,
    dateTimeOriginal: dateTimeOriginal ? dateTimeOriginal.toISOString() : null,
    modifyDate: modifyDate ? modifyDate.toISOString() : null,
    createDate: createDate ? createDate.toISOString() : null,
    hasGPS,
    editedBySoftware,
    dateInconsistent,
    dateDiffSeconds: Math.round(dateDiffSeconds),
    message: messages.join('; '),
    risk: Math.min(risk, 30),
  };
};

/**
 * Error Level Analysis (ELA) — re-saves the image at known JPEG quality and measures
 * pixel-wise differences. Authentic images compress uniformly (low variance); edited
 * regions often show much higher error than the surrounding pixels (high variance).
 */
const checkErrorLevelAnalysis = async (filePath, format) => {
  if (format !== 'jpeg' && format !== 'png' && format !== 'webp') {
    return {
      passed: true,
      message: `ELA not applicable for ${format}`,
      risk: 0,
    };
  }

  try {
    const { data: originalRaw, info } = await sharp(filePath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const resavedJpeg = await sharp(filePath).jpeg({ quality: 90 }).toBuffer();
    const resavedRaw = await sharp(resavedJpeg).raw().toBuffer();

    const length = Math.min(originalRaw.length, resavedRaw.length);
    // Sample for speed on large images (~200k samples max)
    const sampleStep = Math.max(1, Math.floor(length / 200000));
    let sum = 0;
    let sumSq = 0;
    let max = 0;
    let count = 0;

    for (let i = 0; i < length; i += sampleStep) {
      const diff = Math.abs(originalRaw[i] - resavedRaw[i]);
      sum += diff;
      sumSq += diff * diff;
      if (diff > max) max = diff;
      count++;
    }

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    const stdDev = Math.sqrt(Math.max(0, variance));
    const errorRatio = mean > 0 ? max / mean : 0;

    // Typical untouched JPEG: mean < 5, stdDev < 15. Tampered regions push stdDev up.
    const suspicious = stdDev > 25 || errorRatio > 60;
    const risk = Math.min(25, Math.round(stdDev / 2) + (suspicious ? 5 : 0));

    return {
      passed: !suspicious,
      meanError: parseFloat(mean.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      maxError: max,
      errorRatio: parseFloat(errorRatio.toFixed(2)),
      sampleSize: count,
      dimensions: { width: info.width, height: info.height, channels: info.channels },
      message: suspicious
        ? `ELA suggests possible local edits (stdDev=${stdDev.toFixed(1)}, ratio=${errorRatio.toFixed(1)})`
        : `ELA shows uniform compression (stdDev=${stdDev.toFixed(1)})`,
      risk,
    };
  } catch (error) {
    logger.warn(`ELA failed for ${filePath}: ${error.message}`);
    return {
      passed: true,
      message: `ELA skipped: ${error.message}`,
      risk: 0,
    };
  }
};

/**
 * Check for trailing data after image end marker
 */
const checkImageTrailingData = (buffer, format) => {
  let endMarkerIndex = -1;
  let endMarkerSize = 0;

  if (format === 'jpeg') {
    for (let i = buffer.length - 2; i >= 0; i--) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
        endMarkerIndex = i;
        endMarkerSize = 2;
        break;
      }
    }
  } else if (format === 'png') {
    const iendSignature = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
    endMarkerIndex = buffer.lastIndexOf(iendSignature);
    if (endMarkerIndex !== -1) endMarkerSize = iendSignature.length;
  } else {
    return {
      passed: true,
      message: `Trailing data check not implemented for ${format}`,
      risk: 0,
    };
  }

  if (endMarkerIndex === -1) {
    return {
      passed: false,
      message: 'End marker not found',
      risk: 15,
    };
  }

  const trailingBytes = buffer.length - (endMarkerIndex + endMarkerSize);
  const hasTrailing = trailingBytes > 0;

  return {
    passed: !hasTrailing,
    trailingBytes,
    message: hasTrailing
      ? `${trailingBytes} bytes of data after image end marker`
      : 'No trailing data',
    risk: hasTrailing ? Math.min(20, 5 + Math.floor(trailingBytes / 100)) : 0,
  };
};

/**
 * Check for multiple embedded images (concatenated files)
 */
const checkMultipleImages = (buffer, format) => {
  let count = 0;
  if (format === 'jpeg') {
    for (let i = 0; i < buffer.length - 2; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8 && buffer[i + 2] === 0xFF) count++;
    }
  } else if (format === 'png') {
    const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    let from = 0;
    while ((from = buffer.indexOf(sig, from)) !== -1) {
      count++;
      from += sig.length;
    }
  } else {
    return {
      passed: true,
      imageCount: 1,
      message: `Multi-image check not implemented for ${format}`,
      risk: 0,
    };
  }

  // JPEG legitimately has 2 SOI markers when an EXIF thumbnail is embedded.
  const suspicious = count > 2;

  return {
    passed: !suspicious,
    imageCount: count,
    message: suspicious
      ? `Suspicious: ${count} image signatures found (possible concatenation)`
      : count > 1
        ? `${count} image signatures (likely embedded thumbnail)`
        : 'Single image structure',
    risk: suspicious ? 20 : 0,
  };
};

/**
 * Check for excessive comment/text chunks (PNG tEXt/iTXt/zTXt, JPEG COM)
 */
const checkCommentChunks = (buffer, format) => {
  let count = 0;
  const chunkTypes = [];

  if (format === 'png') {
    ['tEXt', 'iTXt', 'zTXt'].forEach((t) => {
      const sig = Buffer.from(t, 'ascii');
      let from = 0;
      let typeCount = 0;
      while ((from = buffer.indexOf(sig, from)) !== -1) {
        typeCount++;
        from += sig.length;
      }
      if (typeCount > 0) chunkTypes.push(`${t}:${typeCount}`);
      count += typeCount;
    });
  } else if (format === 'jpeg') {
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xFE) {
        count++;
        chunkTypes.push('COM');
      }
    }
  } else {
    return {
      passed: true,
      commentCount: 0,
      message: `Comment check not applicable for ${format}`,
      risk: 0,
    };
  }

  const suspicious = count > 5;

  return {
    passed: !suspicious,
    commentCount: count,
    chunkTypes,
    message: suspicious
      ? `Excessive comment/text chunks: ${count}`
      : `${count} comment/text chunks`,
    risk: suspicious ? 10 : 0,
  };
};

/**
 * Check image structural integrity
 */
const checkImageStructuralIntegrity = (buffer, format) => {
  let valid = true;
  const issues = [];

  if (format === 'jpeg') {
    const startsOK = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const endsOK = buffer[buffer.length - 2] === 0xFF && buffer[buffer.length - 1] === 0xD9;
    if (!startsOK) { valid = false; issues.push('Missing SOI marker'); }
    if (!endsOK) { valid = false; issues.push('Missing or misplaced EOI marker'); }
  } else if (format === 'png') {
    const ihdrAtStart = buffer.slice(12, 16).toString('ascii') === 'IHDR';
    const iendAtEnd = buffer.slice(buffer.length - 8, buffer.length - 4).toString('ascii') === 'IEND';
    if (!ihdrAtStart) { valid = false; issues.push('IHDR not at expected position'); }
    if (!iendAtEnd) { valid = false; issues.push('IEND not at end of file'); }
  } else {
    return {
      passed: true,
      issues,
      message: `Structural check not implemented for ${format}`,
      risk: 0,
    };
  }

  return {
    passed: valid,
    issues,
    message: valid ? 'Image structure valid' : `Structural issues: ${issues.join(', ')}`,
    risk: valid ? 0 : 20,
  };
};

/**
 * Check for embedded thumbnail (informational; missing thumbnail can indicate re-encoding)
 */
const checkThumbnailPresence = (buffer, format) => {
  if (format !== 'jpeg') {
    return {
      passed: true,
      hasThumbnail: false,
      message: `Thumbnail check not applicable for ${format}`,
      risk: 0,
    };
  }
  const searchEnd = Math.min(buffer.length, 65536);
  let soiCount = 0;
  for (let i = 0; i < searchEnd - 2; i++) {
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8 && buffer[i + 2] === 0xFF) {
      soiCount++;
      if (soiCount >= 2) break;
    }
  }
  const hasThumbnail = soiCount >= 2;

  return {
    passed: true,
    hasThumbnail,
    message: hasThumbnail
      ? 'Embedded thumbnail present'
      : 'No embedded thumbnail (may indicate re-encoded image)',
    risk: 0,
  };
};

/**
 * Check for AI generation markers — C2PA content credentials, generation parameters,
 * and other traces left by AI image generators like Stable Diffusion, Midjourney, DALL-E.
 */
const checkAIGenerationMarkers = (buffer, format) => {
  const content = buffer.toString('latin1');

  const markers = [];

  // C2PA / Content Credentials (Adobe-led standard for provenance)
  if (/c2pa|content.?credentials|http:\/\/ns\.adobe\.com\/c2pa/i.test(content)) {
    markers.push('Content Credentials (C2PA)');
  }

  // AI generation parameter patterns commonly embedded by Stable Diffusion & derivatives
  const genParamPatterns = [
    /Steps:\s*\d+/i,
    /Seed:\s*\d+/i,
    /CFG\s*[Ss]cale:\s*[\d.]+/i,
    /Sampler:\s*\w+/i,
    /model_hash:/i,
    /negative.?prompt/i,
    /Denoising\s*[Ss]trength/i,
    /ensd\s*\d+/i,
  ];
  const paramMatches = genParamPatterns.filter(r => r.test(content)).length;

  // Known AI tool signatures in raw metadata/text chunks
  const aiToolPatterns = [
    { name: 'Stable Diffusion generation params', regex: /parameters.*\n.*Steps:|positive.*negative/i },
    { name: 'Midjourney metadata', regex: /mj_\w+|job\s*id:|JobID/i },
    { name: 'DALL-E metadata', regex: /dalle|openai.*generat/i },
    { name: 'ComfyUI workflow', regex: /ComfyUI|prompt.*workflow/i },
  ];
  aiToolPatterns.forEach(p => {
    if (p.regex.test(content)) markers.push(p.name);
  });

  // If at least 3 different generation parameter patterns found, it's likely AI-generated
  if (paramMatches >= 3 && !markers.some(m => /C2PA|Stable Diffusion/i.test(m))) {
    markers.push('AI generation parameters detected');
  }

  const detected = markers.length > 0;

  return {
    passed: !detected,
    markers: markers,
    paramPatternsFound: paramMatches,
    message: detected
      ? `AI generation markers: ${markers.join(', ')}`
      : 'No AI generation markers detected',
    risk: detected ? Math.min(30 + markers.length * 10, 60) : 0,
  };
};

/**
 * Run reference-based comparison for a target document against known-good samples
 */
const runReferenceComparison = async (targetPath, referencePaths, mimeType, documentType) => {
  const buffer = fs.readFileSync(targetPath);
  const format = detectImageFormat(buffer);

  const result = {
    used: true,
    referenceCount: referencePaths.length,
    similarityScore: null,
    aspects: {},
    discrepancies: [],
    verdict: 'unknown',
    confidence: 'low',
    explanation: null,
    structureChecks: null,
    geminiAnalysis: null,
  };

  // 1. Structural checks specific to document type
  const structureChecks = {};
  if (documentType === 'AADHAAR_CARD') {
    const content = buffer.toString('latin1');
    structureChecks.emblemPresent = /\u0917\u0923\u0924\u0902\u0924\u094D\u0930|ashoka|emblem|government|भारत/i.test(content);
    structureChecks.qrLikeRegion = content.includes('QR') || content.includes('QRI');
    structureChecks.aadhaarNumberPattern = /\d{4}\s?\d{4}\s?\d{4}/.test(content);
    structureChecks.dottedBorder = /\.\.\.\.\.\.\.\.\.\.\.\.|-----/.test(content);
  }
  result.structureChecks = structureChecks;

  // 2. Gemini side-by-side visual comparison
  try {
    const geminiResult = await geminiService.compareDocumentWithReference(
      targetPath, referencePaths, mimeType, documentType
    );
    result.geminiAnalysis = geminiResult;
    result.similarityScore = geminiResult.similarityScore;
    result.aspects = geminiResult.aspects || {};
    result.discrepancies = geminiResult.discrepancies || [];
    result.verdict = geminiResult.verdict || 'unknown';
    result.confidence = geminiResult.confidence || 'low';
    result.explanation = geminiResult.explanation || null;
  } catch (error) {
    logger.warn(`Reference comparison Gemini analysis failed: ${error.message}`);
    result.geminiAnalysis = { success: false, error: error.message };
  }

  return result;
};

/**
 * Generate human-readable summary for image tampering check
 */
const generateImageSummary = (checks, riskScore, referenceComparison) => {
  const warnings = [];
  if (checks.fileSignature.mismatch) warnings.push('File signature mismatch');
  if (checks.softwareFingerprint.detectedSoftware && checks.softwareFingerprint.detectedSoftware.length > 0) {
    warnings.push(`Edited with ${checks.softwareFingerprint.detectedSoftware.join(', ')}`);
  }
  if (checks.exifMetadata.editedBySoftware) warnings.push(`EXIF Software: ${checks.exifMetadata.software}`);
  if (checks.exifMetadata.dateInconsistent) warnings.push('EXIF date inconsistency');
  if (checks.exifMetadata.hasExif === false && checks.exifMetadata.passed === false) warnings.push('EXIF metadata missing or unparseable');
  if (checks.errorLevelAnalysis && !checks.errorLevelAnalysis.passed) warnings.push('ELA anomalies');
  if (checks.trailingData.trailingBytes > 0) warnings.push('Data after image end marker');
  if (checks.multipleImages.imageCount > 2) warnings.push('Multiple image signatures');
  if (checks.commentChunks.commentCount > 5) warnings.push('Excessive comment chunks');
  if (!checks.structuralIntegrity.passed) warnings.push('Structural issues');
  if (checks.aiGenerationMarkers && !checks.aiGenerationMarkers.passed) {
    warnings.push(`AI generation detected: ${checks.aiGenerationMarkers.markers.join(', ')}`);
  }
  if (referenceComparison && referenceComparison.verdict === 'likely_tampered') {
    warnings.push(`Reference comparison: ${referenceComparison.explanation || 'mismatch with reference samples'}`);
  }

  if (warnings.length === 0) {
    return 'Image appears safe with no suspicious indicators';
  }
  return `Risk level ${getRiskLevel(riskScore)}: ${warnings.join(', ')}`;
};

module.exports = {
  checkPDFTampering,
  checkImageTampering,
};

