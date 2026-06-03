const fs = require('fs');
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');

/**
 * Perform comprehensive PDF tampering checks
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} - Tampering check results
 */
const checkPDFTampering = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfContent = dataBuffer.toString('latin1');

    const checks = {
      digitalSignature: checkDigitalSignature(pdfContent),
      incrementalUpdates: checkIncrementalUpdates(pdfContent),
      metadataConsistency: await checkMetadataConsistency(dataBuffer),
      embeddedFiles: checkEmbeddedFiles(pdfContent),
      javaScriptDetection: checkJavaScript(pdfContent),
      eofValidation: checkEOFMarker(pdfContent),
      encryptionStatus: checkEncryption(pdfContent),
      versionConsistency: checkPDFVersion(pdfContent),
      xrefTableValidation: checkXRefTable(pdfContent),
      fontSubstitution: checkFontSubstitution(pdfContent),
    };

    // Calculate overall risk score
    const riskScore = calculateRiskScore(checks);

    return {
      safe: riskScore < 30,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      checks,
      summary: generateSummary(checks, riskScore),
    };
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
const checkMetadataConsistency = async (dataBuffer) => {
  try {
    const data = await pdfParse(dataBuffer);
    const creationDate = extractDate(data.info.CreationDate);
    const modDate = extractDate(data.info.ModDate);

    const inconsistent = modDate && creationDate && modDate < creationDate;

    return {
      passed: !inconsistent,
      creationDate: data.info.CreationDate || 'Unknown',
      modificationDate: data.info.ModDate || 'Unknown',
      producer: data.info.Producer || 'Unknown',
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

module.exports = {
  checkPDFTampering,
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
