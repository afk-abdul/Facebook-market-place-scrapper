import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    console.log('runtimeeeeeee content view loaded');
  }, []);

  return <div className="runtime-content-view-text">runtime content view</div>;
}
