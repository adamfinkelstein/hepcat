import LoadingIframe from '../components/LoadingIframe';

export default function GuidePage() {
  const url =
    'https://docs.google.com/document/d/e/2PACX-1vTooKgBrn5p5NGoXrnf6eAoLMRZPJRTOaSRR-fb4lvv1aDAEFoI4u__2MMFoOwQuBf4mg8DUcAtwO5t/pub?embedded=true';
  return <LoadingIframe url={url} title="Hepcat Guide" />;
}
