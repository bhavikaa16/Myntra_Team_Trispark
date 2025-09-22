import React, { useRef, useEffect, useState } from 'react';

interface CameraViewProps {
  onCapture: (imageDataUrl: string) => void;
  captureLabel: string;
  guidelineText: string;
  facingMode?: 'user' | 'environment';
}

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const CameraLoadingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-gray-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


const CameraView: React.FC<CameraViewProps> = ({ onCapture, captureLabel, guidelineText, facingMode = 'user' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      setIsCameraReady(false); // Reset on change
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.oncanplay = () => {
            setIsCameraReady(true);
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError("Camera permission denied. Please enable it in your browser settings and refresh.");
            } else {
                setError("Could not access the camera. Please ensure it is not in use by another application and refresh.");
            }
        } else {
             setError("An unknown error occurred while accessing the camera.");
        }
        setIsCameraReady(false);
      }
    };
    startCamera();
    return () => {
        stream?.getTracks().forEach(track => track.stop());
    }
  }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && isCameraReady) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Conditionally flip the image horizontally for a mirror effect on the user-facing camera
        if (facingMode === 'user') {
          context.translate(video.videoWidth, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl);
      }
    }
  };

  if (error) {
      return <div className="flex items-center justify-center h-full text-red-400 text-lg p-8 text-center">{error}</div>
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative bg-black">
      {/* Conditionally apply the horizontal flip for the video preview */}
      <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover transition-opacity duration-500 ${facingMode === 'user' ? 'transform -scale-x-100' : ''} ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}></video>
      
      {!isCameraReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
          <CameraLoadingIcon />
          <p className="mt-4 text-white text-lg">Initializing Camera...</p>
        </div>
      )}

      {isCameraReady && (
        <>
            <div className="absolute inset-0 border-8 border-white/20 rounded-3xl m-4 pointer-events-none" aria-hidden="true"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white bg-black/50 px-4 py-2 rounded-lg pointer-events-none">
                {guidelineText}
            </div>
        </>
      )}

      <canvas ref={canvasRef} className="hidden"></canvas>
      <div className="absolute bottom-8 w-full px-8">
        <button
          onClick={handleCapture}
          disabled={!isCameraReady}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 text-lg transition-all duration-300 ease-in-out active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-1 disabled:from-gray-500 disabled:to-gray-600 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
          aria-label={captureLabel}
        >
          <CameraIcon />
          {captureLabel}
        </button>
      </div>
    </div>
  );
};

export default CameraView;
