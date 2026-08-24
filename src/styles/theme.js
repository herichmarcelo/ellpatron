export const theme = {
  colors: {
    // Background colors - Premium scheme
    background: {
      primary: '#0a0a0a',
      secondary: '#1a1a1a',
      tertiary: '#2d2d2d',
      card: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
      input: '#2d2d2d',
      modal: '#1a1a1a'
    },
    
    // Gold colors - Specific hex codes
    gold: {
      primary: '#FFD700',
      secondary: '#D4AF37',
      dark: '#B8860B',
      light: '#DAA520',
      gradient: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)',
      border: 'rgba(212, 175, 55, 0.3)'
    },
    
    // Text colors
    text: {
      primary: '#ffffff',
      secondary: '#e0e0e0',
      muted: '#a0a0a0'
    },
    
    // Status colors - Specific hex codes
    status: {
      success: '#00d084',
      warning: '#ffb800',
      danger: '#ff4757',
      info: '#3742fa'
    },
    
    // Borders
    border: {
      gold: '1px solid rgba(212, 175, 55, 0.3)',
      dark: '#333333',
      light: 'rgba(212, 175, 55, 0.2)'
    },
    
    // Shadows - Premium styling
    shadow: {
      gold: '0 4px 20px rgba(212, 175, 55, 0.15)',
      goldHover: '0 6px 30px rgba(212, 175, 55, 0.25)',
      card: '0 8px 32px rgba(0, 0, 0, 0.4)',
      modal: '0 8px 32px rgba(0, 0, 0, 0.7)'
    }
  },
  
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px'
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '50%'
  },
  
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '24px',
      xxl: '32px',
      xxxl: '48px'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease'
  },
  
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070
  }
};

export default theme;