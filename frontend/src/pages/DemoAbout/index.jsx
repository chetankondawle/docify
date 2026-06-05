import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const flowSteps = [
  { icon: <CloudUploadIcon />, label: 'Upload', desc: 'Upload a document and select its type (Aadhaar, PAN, Passport, or Salary Slip).' },
  { icon: <TextSnippetIcon />, label: 'Extract OCR', desc: 'AI reads text from the document and structures it into fields.' },
  { icon: <SecurityIcon />, label: 'Security Check', desc: '10 heuristic checks + Gemini AI forensics + reference comparison run in one click.' },
  { icon: <VisibilityIcon />, label: 'Review', desc: 'Risk gauge, per-check breakdown, AI verdict, and reference similarity score are displayed.' },
  { icon: <VerifiedUserIcon />, label: 'Cross-Validate', desc: 'Compare extracted data across multiple documents to detect inconsistencies.' },
];

const DemoAboutPage = () => {
  const theme = useTheme();
  const gradient = `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.purple?.[500] || theme.palette.primary.dark})`;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, md: 3 } }}>
      {/* Hero */}
      <Box sx={{ textAlign: 'center', pt: { xs: 2, md: 3 }, pb: { xs: 4, md: 6 } }}>
        <Typography variant="h3" fontWeight={800} sx={{
          background: gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          mb: 1,
        }}>
          TruExtract
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={400}>
          AI-Powered Document Validation &amp; Forgery Detection Platform
        </Typography>
      </Box>

      {/* Problem */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ pb: 1.5, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          The Problem
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2.5, flexWrap: 'wrap' }}>
          {[
            { icon: '🆔', title: 'Identity Fraud', desc: 'Fake Aadhaar, PAN, and passport documents are used to bypass KYC checks, costing businesses millions in fraud losses.' },
            { icon: '📄', title: 'Document Forgery', desc: 'Photoshopped salary slips, altered bank statements, and tampered certificates are increasingly sophisticated and hard to detect manually.' },
            { icon: '🤖', title: 'AI-Generated Fakes', desc: 'Generative AI can now create realistic fake IDs and forged documents that fool traditional rule-based checks.' },
          ].map((item, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2.5, borderRadius: 2, width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: theme.shadows[3] } }}>
              <Typography variant="h4" sx={{ mb: 1.5, lineHeight: 1 }}>{item.icon}</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{item.desc}</Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Basic Flow */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ pb: 1.5, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          Basic Flow
        </Typography>
        <Box sx={{
          display: { xs: 'none', md: 'flex' },
          justifyContent: 'center', alignItems: 'flex-start',
          gap: 0,
        }}>
          {flowSteps.map((step, i) => (
            <Box key={i} sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              width: 200, flexShrink: 0,
              px: 0.5,
            }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: '50%',
                background: gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
                '& .MuiSvgIcon-root': { fontSize: 28 },
                boxShadow: theme.shadows[2],
              }}>
                {step.icon}
              </Box>
              <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mt: 1.5, textAlign: 'center' }}>
                {step.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{
                mt: 0.5, px: 0.5, textAlign: 'center', lineHeight: 1.4,
              }}>
                {step.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Approach */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ pb: 1.5, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          Our Approach
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[
            { num: '1', title: 'Upload & OCR', desc: 'User uploads a document and selects its type. The system extracts text via AI-powered OCR (Gemini 2.0 Flash).' },
            { num: '2', title: 'Heuristic Analysis', desc: '10 automated checks run on every document: file signature validation, EXIF metadata parsing, error-level analysis (ELA), software fingerprinting, trailing data detection, structural integrity, and AI generation markers.' },
            { num: '3', title: 'AI Forensic Analysis', desc: 'A vision model examines the image for visual tampering signs — inconsistent lighting, cloned regions, garbled text, anatomical errors — and provides a plain-language verdict.' },
            { num: '4', title: 'Reference Comparison', desc: 'The target document is compared side-by-side against known-good reference samples. Layout, emblem, QR code, font, and border consistency are scored.' },
            { num: '5', title: 'Combined Verdict', desc: 'Heuristic checks + AI analysis + reference comparison are fused into a single risk score and actionable verdict.' },
          ].map((step, i) => (
            <Paper key={i} variant="outlined" sx={{
              display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.5, borderRadius: 2,
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'primary.main' },
            }}>
              <Box sx={{
                width: 32, height: 32, minWidth: 32,
                background: gradient,
                color: '#fff', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
              }}>
                {step.num}
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">{step.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{step.desc}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Tech Stack */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ pb: 1.5, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          Technology Stack
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          {[
            { icon: '⚛️', title: 'Frontend', desc: 'React 18, Vite, CSS Modules, React Router' },
            { icon: '🟢', title: 'Backend', desc: 'Node.js, Express, Multer, sharp, exiftool-vendored' },
            { icon: '🧠', title: 'AI', desc: 'Google Gemini via OpenAI SDK (HackDNA API), vision-based forensic analysis' },
            { icon: '🔐', title: 'Security', desc: 'EXIF parsing (ExifTool), Error-Level Analysis (ELA), file signature validation, C2PA detection' },
          ].map((item, i) => (
            <Paper key={i} variant="outlined" sx={{ textAlign: 'center', p: 2.5, borderRadius: 2, width: 200, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: theme.shadows[3] } }}>
              <Typography variant="h4" sx={{ mb: 1, lineHeight: 1 }}>{item.icon}</Typography>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 0.25 }}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{item.desc}</Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Key Learnings */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ pb: 1.5, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          Key Learnings
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[
            'EXIF metadata alone is insufficient — AI-generated images often lack EXIF entirely. Combine heuristic + AI for robust detection.',
            'Reference samples dramatically improve detection accuracy — side-by-side comparison catches layout shifts and font mismatches that heuristics miss.',
            'Error-Level Analysis (ELA) is effective against localized edits (copy-paste) but less useful for AI-generated images that are uniformly artificial.',
          ].map((text, i) => (
            <Paper key={i} variant="outlined" sx={{
              display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.5, borderRadius: 2,
              bgcolor: theme.palette.warning?.[50] || '#fffbeb',
              borderColor: theme.palette.warning?.[200] || '#fde68a',
            }}>
              <Typography variant="body1" sx={{ minWidth: 24 }}>💡</Typography>
              <Typography variant="body2" sx={{ color: theme.palette.warning?.[800] || '#92400e', lineHeight: 1.6 }}>{text}</Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* CTA */}
      <Box sx={{
        textAlign: 'center', py: { xs: 3, md: 4 }, px: { xs: 2, md: 4 },
        background: gradient,
        borderRadius: 3,
        color: '#fff',
      }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Ready to try it?</Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
          Upload a document and run the full security check in under 30 seconds.
        </Typography>
        <Button
          component={Link}
          to="/documents"
          variant="contained"
          disableElevation
          sx={{
            bgcolor: '#fff', color: 'primary.main', fontWeight: 700, borderRadius: 2, px: 4, py: 1.25,
            '&:hover': { bgcolor: 'grey.50', transform: 'translateY(-2px)', boxShadow: theme.shadows[4] },
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
        >
          Go to Documents →
        </Button>
      </Box>
    </Container>
  );
};

export default DemoAboutPage;