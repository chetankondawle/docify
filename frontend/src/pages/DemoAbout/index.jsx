import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const useInView = (threshold = 0.1) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
};

const SlideIn = ({ children, delay = 0, sx = {} }) => {
  const [ref, inView] = useInView(0.08);
  return (
    <Box
      ref={ref}
      sx={{
        opacity: 0,
        transform: 'translateY(32px)',
        transition: `opacity 0.6s ease${delay ? ` ${delay}s` : ''}, transform 0.6s ease${delay ? ` ${delay}s` : ''}`,
        ...(inView && { opacity: 1, transform: 'translateY(0)' }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

const steps = [
  { icon: <CloudUploadIcon />, label: 'Upload', desc: 'Upload a document and select its type.' },
  { icon: <TextSnippetIcon />, label: 'Extract OCR', desc: 'AI reads and structures document text.' },
  { icon: <SecurityIcon />, label: 'Security Check', desc: '10 heuristics + AI forensics run in one click.' },
  { icon: <VisibilityIcon />, label: 'Review', desc: 'Risk gauge, per-check breakdown, and AI verdict.' },
  { icon: <VerifiedUserIcon />, label: 'Cross-Validate', desc: 'Compare extracted data across documents.' },
];

const stepResults = [
  {
    title: 'Upload Complete',
    lines: [
      { label: 'File', value: 'aadhaar-sample.jpg' },
      { label: 'Size', value: '2.4 MB' },
      { label: 'Type', value: 'Aadhaar Card' },
      { label: 'Status', value: 'Uploaded', ok: true },
    ],
  },
  {
    title: 'OCR Extraction Complete',
    lines: [
      { label: 'Name', value: 'Ravi Kumar Sharma' },
      { label: 'DOB', value: '15/08/1992' },
      { label: 'Aadhaar No.', value: 'XXXX XXXX 1234' },
      { label: 'Gender', value: 'Male' },
    ],
  },
  {
    title: 'Security Check Results',
    lines: [
      { label: 'File Signature', ok: true, value: 'Valid JPEG' },
      { label: 'Software Fingerprint', ok: true, value: 'None detected' },
      { label: 'EXIF Metadata', ok: false, value: 'Missing (stripped)' },
      { label: 'ELA Analysis', ok: true, value: 'Uniform compression' },
      { label: 'AI Markers', ok: true, value: 'None detected' },
    ],
  },
  {
    title: 'Final Verdict',
    lines: [
      { label: 'Risk Score', value: '24/100 — Low Risk' },
      { label: 'AI Verdict', value: 'Authentic (high confidence)' },
      { label: 'Reference Match', value: '92% similarity' },
      { label: 'Overall', value: 'PASS — No tampering detected', ok: true },
    ],
  },
  {
    title: 'Cross-Validation Complete',
    lines: [
      { label: 'Documents', value: '3 compared' },
      { label: 'Name', value: 'Consistent across all' },
      { label: 'DOB', value: 'Consistent across all' },
      { label: 'Status', value: 'No discrepancies found', ok: true },
    ],
  },
];

const DemoAboutPage = () => {
  const theme = useTheme();
  const gradient = `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.purple?.[500] || theme.palette.primary.dark})`;

  const [activeStep, setActiveStep] = useState(-1);
  const [playState, setPlayState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const timers = useRef([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const startDemo = useCallback(() => {
    clearTimers();
    setActiveStep(-1);
    setProgress(0);
    setPlayState('playing');

    steps.forEach((_, i) => {
      const t = setTimeout(() => {
        setActiveStep(i);
        setProgress(((i + 1) / steps.length) * 100);
        if (i === steps.length - 1) {
          setTimeout(() => setPlayState('done'), 600);
        }
      }, (i + 1) * 1200);
      timers.current.push(t);
    });
  }, [clearTimers]);

  const resetDemo = useCallback(() => {
    clearTimers();
    setActiveStep(-1);
    setProgress(0);
    setPlayState('idle');
  }, [clearTimers]);

  const handleStepClick = useCallback((i) => {
    if (playState === 'playing') return;
    setActiveStep(i);
    setProgress(((i + 1) / steps.length) * 100);
    setPlayState('partial');
  }, [playState]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, md: 3 } }}>
      {/* Hero */}
      <SlideIn>
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
      </SlideIn>

      {/* Problem */}
      <SlideIn>
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
              <SlideIn key={i} delay={0.1 * (i + 1)}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, width: 280, height: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: theme.shadows[3] } }}>
                  <Typography variant="h4" sx={{ mb: 1.5, lineHeight: 1 }}>{item.icon}</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{item.desc}</Typography>
                </Paper>
              </SlideIn>
            ))}
          </Box>
        </Box>
      </SlideIn>

      {/* Interactive Demo Flow */}
      <SlideIn>
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Live Demo
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {playState === 'idle' && (
                <Button size="small" variant="contained" disableElevation onClick={startDemo} startIcon={<PlayArrowIcon />} sx={{ borderRadius: 2, fontWeight: 600 }}>
                  Start Simulation
                </Button>
              )}
              {(playState === 'done' || playState === 'partial') && (
                <Button size="small" variant="outlined" onClick={resetDemo} startIcon={<ReplayIcon />} sx={{ borderRadius: 2, fontWeight: 600 }}>
                  Reset
                </Button>
              )}
            </Box>
          </Box>

          {playState !== 'idle' && (
            <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2, mb: 2.5 }} />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 0 }}>
            {steps.map((step, i) => {
              const isActive = activeStep >= i;
              const isCurrent = activeStep === i;
              return (
                <Box key={i} onClick={() => handleStepClick(i)} sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  width: 180, flexShrink: 0, px: 0.5, cursor: playState === 'playing' ? 'default' : 'pointer',
                  opacity: isActive ? 1 : 0.45,
                  transition: 'opacity 0.3s',
                }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: isActive ? gradient : 'grey.200',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isActive ? '#fff' : 'grey.500',
                    '& .MuiSvgIcon-root': { fontSize: 22 },
                    boxShadow: isCurrent ? theme.shadows[4] : theme.shadows[1],
                    transition: 'all 0.3s',
                    transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                  }}>
                    {step.icon}
                  </Box>
                  <Typography variant="caption" fontWeight={isActive ? 700 : 500} color={isActive ? 'text.primary' : 'text.secondary'} sx={{ mt: 1, textAlign: 'center' }}>
                    {step.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {activeStep >= 0 && stepResults[activeStep] && (
            <Paper variant="outlined" sx={{ mt: 2.5, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                <Typography variant="subtitle2" fontWeight={600}>{stepResults[activeStep].title}</Typography>
              </Box>
              <Box sx={{ p: 1.5 }}>
                {stepResults[activeStep].lines.map((line, j) => (
                  <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 120, flexShrink: 0, fontWeight: 500 }}>{line.label}</Typography>
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {line.ok !== undefined ? (
                        <Chip
                          icon={line.ok ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <ErrorIcon sx={{ fontSize: 14 }} />}
                          label={line.value || (line.ok ? 'Passed' : 'Flagged')}
                          size="small"
                          color={line.ok ? 'success' : 'warning'}
                          variant="outlined"
                          sx={{ height: 22, '& .MuiChip-icon': { fontSize: 14, ml: 0.5 } }}
                        />
                      ) : line.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {activeStep === -1 && playState === 'idle' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PlayArrowIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Click "Start Simulation" to see the document verification flow in action.</Typography>
            </Box>
          )}
        </Box>
      </SlideIn>

      {/* Approach */}
      <SlideIn>
        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ pb: 1.5, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            Our Approach
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              { num: '1', title: 'Upload & OCR', desc: 'User uploads a document and selects its type. The system extracts text via AI-powered OCR.' },
              { num: '2', title: 'Heuristic Analysis', desc: '10 automated checks run on every document: file signature validation, EXIF metadata parsing, error-level analysis (ELA), software fingerprinting, trailing data detection, structural integrity, and AI generation markers.' },
              { num: '3', title: 'AI Forensic Analysis', desc: 'A vision model examines the image for visual tampering signs — inconsistent lighting, cloned regions, garbled text, anatomical errors — and provides a plain-language verdict.' },
              { num: '4', title: 'Reference Comparison', desc: 'The target document is compared side-by-side against known-good reference samples. Layout, emblem, QR code, font, and border consistency are scored.' },
              { num: '5', title: 'Combined Verdict', desc: 'Heuristic checks + AI analysis + reference comparison are fused into a single risk score and actionable verdict.' },
            ].map((step, i) => (
              <SlideIn key={i} delay={0.08 * (i + 1)}>
                <Paper variant="outlined" sx={{
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
              </SlideIn>
            ))}
          </Box>
        </Box>
      </SlideIn>

      {/* Tech Stack */}
      <SlideIn>
        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ pb: 1.5, mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            Technology Stack
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {[
              { icon: '⚛️', title: 'Frontend', desc: 'React 18, Vite, CSS Modules, React Router' },
              { icon: '🟢', title: 'Backend', desc: 'Node.js, Express, Multer, sharp, exiftool-vendored' },
              { icon: '🧠', title: 'AI', desc: 'OpenAI SDK via HackDNA API, multi-model vision-based forensic analysis' },
              { icon: '🔐', title: 'Security', desc: 'EXIF parsing (ExifTool), Error-Level Analysis (ELA), C2PA detection' },
            ].map((item, i) => (
              <SlideIn key={i} delay={0.1 * (i + 1)}>
                <Paper variant="outlined" sx={{ textAlign: 'center', p: 2.5, borderRadius: 2, width: 200, height: 180, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: theme.shadows[3] } }}>
                  <Typography variant="h4" sx={{ mb: 1, lineHeight: 1 }}>{item.icon}</Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 0.25 }}>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{item.desc}</Typography>
                </Paper>
              </SlideIn>
            ))}
          </Box>
        </Box>
      </SlideIn>

      {/* Key Learnings */}
      <SlideIn>
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
              <SlideIn key={i} delay={0.1 * (i + 1)}>
                <Paper variant="outlined" sx={{
                  display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.5, borderRadius: 2,
                  bgcolor: theme.palette.warning?.[50] || '#fffbeb',
                  borderColor: theme.palette.warning?.[200] || '#fde68a',
                }}>
                  <Typography variant="body1" sx={{ minWidth: 24 }}>💡</Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.warning?.[800] || '#92400e', lineHeight: 1.6 }}>{text}</Typography>
                </Paper>
              </SlideIn>
            ))}
          </Box>
        </Box>
      </SlideIn>

      {/* CTA */}
      <SlideIn>
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
      </SlideIn>
    </Container>
  );
};

export default DemoAboutPage;