import { useEffect, useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlinedIcon from '@mui/icons-material/FormatItalicOutlined';
import FormatUnderlinedOutlinedIcon from '@mui/icons-material/FormatUnderlinedOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';

const editorBoxSx = (hasError) => ({
  border: '1px solid',
  borderColor: hasError ? 'error.main' : 'divider',
  minHeight: 150,
  px: 1,
  py: 0.8,
  overflowY: 'auto',
  outline: 'none',
  '&:focus': {
    borderColor: 'primary.main'
  },
  '& p': {
    margin: '0 0 0.5rem'
  },
  '& ul': {
    margin: '0 0 0.5rem',
    paddingLeft: '1.2rem'
  }
});

const HtmlEditorField = ({ label, value, onChange, error = false, helperText = '' }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const executeCommand = (command) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    editorRef.current?.focus();
    document.execCommand('createLink', false, url);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <Stack spacing={0.6}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" size="small" onClick={() => executeCommand('bold')} startIcon={<FormatBoldOutlinedIcon />}>
          Bold
        </Button>
        <Button variant="outlined" size="small" onClick={() => executeCommand('italic')} startIcon={<FormatItalicOutlinedIcon />}>
          Italic
        </Button>
        <Button variant="outlined" size="small" onClick={() => executeCommand('underline')} startIcon={<FormatUnderlinedOutlinedIcon />}>
          Underline
        </Button>
        <Button variant="outlined" size="small" onClick={() => executeCommand('insertUnorderedList')} startIcon={<FormatListBulletedOutlinedIcon />}>
          List
        </Button>
        <Button variant="outlined" size="small" onClick={insertLink} startIcon={<LinkOutlinedIcon />}>
          Link
        </Button>
        <Button variant="outlined" size="small" onClick={() => executeCommand('removeFormat')} startIcon={<ClearOutlinedIcon />}>
          Clear
        </Button>
      </Stack>
      <Box
        ref={editorRef}
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        sx={editorBoxSx(error)}
      />
      {helperText ? (
        <Typography variant="caption" color={error ? 'error.main' : 'text.secondary'}>
          {helperText}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default HtmlEditorField;
