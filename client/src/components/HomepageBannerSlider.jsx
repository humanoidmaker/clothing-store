import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { Link as RouterLink } from 'react-router-dom';

const isExternalLink = (value) => /^https?:\/\//i.test(String(value || '').trim());

const normalizeBanners = (sliderSettings = {}) => {
  const source = sliderSettings && typeof sliderSettings === 'object' ? sliderSettings : {};
  const banners = Array.isArray(source.banners) ? source.banners : [];

  return banners
    .map((entry, index) => {
      const banner = entry && typeof entry === 'object' ? entry : {};
      const desktopImage = String(banner.desktopImage || '').trim();
      const mobileImage = String(banner.mobileImage || '').trim();
      if (!desktopImage || !mobileImage) return null;

      return {
        id: String(banner.id || '').trim() || `banner-${index + 1}`,
        desktopImage,
        mobileImage,
        altText: String(banner.altText || '').trim() || `Homepage banner ${index + 1}`,
        linkUrl: String(banner.linkUrl || '').trim()
      };
    })
    .filter(Boolean);
};

const BannerImage = ({ banner, isMobile }) => {
  const displayImage = isMobile ? banner.mobileImage || banner.desktopImage : banner.desktopImage || banner.mobileImage;

  return (
    <Box
      component="img"
      src={displayImage}
      alt={banner.altText}
      loading="lazy"
      sx={{
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        objectPosition: 'center'
      }}
    />
  );
};

const BannerLinkWrapper = ({ banner, children }) => {
  const linkUrl = String(banner.linkUrl || '').trim();
  if (!linkUrl) return children;

  if (isExternalLink(linkUrl)) {
    return (
      <Box
        component="a"
        href={linkUrl}
        target="_blank"
        rel="noreferrer"
        sx={{ display: 'block', lineHeight: 0, height: '100%' }}
      >
        {children}
      </Box>
    );
  }

  return (
    <Box component={RouterLink} to={linkUrl} sx={{ display: 'block', lineHeight: 0, height: '100%' }}>
      {children}
    </Box>
  );
};

const HomepageBannerSlider = ({ sliderSettings }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const banners = useMemo(() => normalizeBanners(sliderSettings), [sliderSettings]);
  const [activeIndex, setActiveIndex] = useState(0);
  const isEnabled = Boolean(sliderSettings?.enabled);

  useEffect(() => {
    setActiveIndex(0);
  }, [banners.length, isMobile]);

  useEffect(() => {
    if (!isEnabled || banners.length < 2) return undefined;

    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 4200);

    return () => clearInterval(intervalId);
  }, [isEnabled, banners.length]);

  if (!isEnabled || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[activeIndex] || banners[0];
  const canNavigate = banners.length > 1;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1.1,
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: { xs: 1, sm: 1.2 },
          py: { xs: 0.8, sm: 0.9 },
          height: { xs: 120, sm: 142, md: 154, lg: 168 },
          maxHeight: { xs: 120, sm: 142, md: 154, lg: 168 }
        }}
      >
        <BannerLinkWrapper banner={currentBanner}>
          <BannerImage banner={currentBanner} isMobile={isMobile} />
        </BannerLinkWrapper>

        {canNavigate ? (
          <>
            <IconButton
              size="small"
              onClick={() => setActiveIndex((current) => (current - 1 + banners.length) % banners.length)}
              sx={{
                position: 'absolute',
                left: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0,0,0,0.25)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.35)' }
              }}
              aria-label="Previous banner"
            >
              <ChevronLeftRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setActiveIndex((current) => (current + 1) % banners.length)}
              sx={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(0,0,0,0.25)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.35)' }
              }}
              aria-label="Next banner"
            >
              <ChevronRightRoundedIcon fontSize="small" />
            </IconButton>
          </>
        ) : null}
      </Box>

      {canNavigate ? (
        <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ pb: 0.7 }}>
          {banners.map((banner, index) => (
            <Box
              key={banner.id}
              component="button"
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to banner ${index + 1}`}
              sx={{
                border: 0,
                p: 0,
                m: 0,
                width: index === activeIndex ? 14 : 8,
                height: 8,
                borderRadius: 99,
                cursor: 'pointer',
                bgcolor: index === activeIndex ? 'secondary.main' : 'divider',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', pb: 0.7 }}>
          Banner
        </Typography>
      )}
    </Paper>
  );
};

export default HomepageBannerSlider;
