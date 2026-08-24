import React, { useState, useRef, useEffect } from 'react';

const LazyImage = ({ src, alt, className, placeholder = null, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div ref={imgRef} className={`lazy-image-wrapper ${className || ''}`} {...props}>
      {placeholder && !isLoaded && (
        <div className="lazy-image-placeholder">
          {placeholder}
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'lazy-image--loaded' : ''}`}
          onLoad={handleLoad}
          loading="lazy"
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}
    </div>
  );
};

export default LazyImage;
