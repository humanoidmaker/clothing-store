import { Box } from '@mui/material';

const fallbackImage = 'https://placehold.co/900x1200?text=Product';

const ProductImageViewport = ({
  src,
  alt,
  aspectRatio = '1 / 1',
  fit = 'cover',
  containerSx = {},
  imageSx = {}
}) => (
  <Box
    sx={{
      position: 'relative',
      width: '100%',
      aspectRatio,
      overflow: 'hidden',
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'grey.100',
      ...containerSx
    }}
  >
    <Box
      component="img"
      src={src || fallbackImage}
      alt={alt}
      loading="lazy"
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: fit,
        ...imageSx
      }}
    />
  </Box>
);

export default ProductImageViewport;
