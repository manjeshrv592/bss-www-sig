"use client";

import { useEffect, useRef, useState } from "react";

interface SignaturePreviewProps {
  html: string;
}

export function SignaturePreview({ html }: SignaturePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const updateHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          const newHeight = doc.body.scrollHeight;
          if (newHeight > 0) {
            setHeight(newHeight);
          }
        }
      } catch {
        // Cross-origin issues won't happen with srcDoc, but just in case
      }
    };

    iframe.addEventListener("load", updateHeight);
    // Also try after a short delay for images to load
    const timer = setTimeout(updateHeight, 100);

    return () => {
      iframe.removeEventListener("load", updateHeight);
      clearTimeout(timer);
    };
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      className="w-full border-0"
      style={{ height: `${height}px` }}
      title="Signature Preview"
    />
  );
}
