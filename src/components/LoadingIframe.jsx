import Container from 'react-bootstrap/Container';
import { useState } from 'react';

export default function LoadingIframe({ url, title }) {
  const [isLoading, setIsLoading] = useState(true);
  const display = isLoading ? 'none' : 'block';

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <Container className="LoadingIframe">
      {isLoading && <h1>Loading...</h1>}
      <iframe
        width="100%"
        title={title}
        src={url}
        onLoad={handleLoad}
        style={{ display: { display } }}
      />
    </Container>
  );
}
