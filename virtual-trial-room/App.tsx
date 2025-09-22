import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppStep } from './types';
import Spinner from './components/Spinner';
import { performVirtualTryOn } from './services/geminiService';

const Header = () => (
    <header className="absolute top-0 left-0 w-full p-4 text-center bg-gradient-to-b from-black/70 to-transparent z-10">
        <h1 className="text-2xl font-bold">Virtual Trial Room <span className="font-light text-gray-300">by Drivi.AI</span></h1>
    </header>
);

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.SELECT_CUSTOMER_SOURCE);
    const [customerImage, setCustomerImage] = useState<string | null>(null);
    const [garmentImage, setGarmentImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const customerFileInputRef = useRef<HTMLInputElement>(null);
    const garmentFileInputRef = useRef<HTMLInputElement>(null);
    const customerCameraInputRef = useRef<HTMLInputElement>(null);
    const garmentCameraInputRef = useRef<HTMLInputElement>(null);
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    // State for adjustments
    const [showAdjustments, setShowAdjustments] = useState(false);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [opacity, setOpacity] = useState(1);
    const [lighting, setLighting] = useState('original'); // 'original', 'brighter', 'dimmer'


    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) {
            return;
        }
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        setInstallPrompt(null);
    };

    const handleFileSelect = useCallback((
        event: React.ChangeEvent<HTMLInputElement>,
        imageSetter: React.Dispatch<React.SetStateAction<string | null>>,
        nextStep: AppStep,
        errorStep: AppStep
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    imageSetter(reader.result);
                    setStep(nextStep);
                }
            };
            reader.onerror = () => {
                setError("Failed to read the selected file. Please try another image.");
                setStep(errorStep);
            };
            reader.readAsDataURL(file);
        }
        // Reset input value to allow re-selecting the same file
        event.target.value = '';
    }, []);

    const handleCustomerFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(event, setCustomerImage, AppStep.PREVIEW_CUSTOMER, AppStep.SELECT_CUSTOMER_SOURCE);
    };

    const handleGarmentFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(event, setGarmentImage, AppStep.PREVIEW_GARMENT, AppStep.SELECT_GARMENT_SOURCE);
    };

    const handleTryOn = useCallback(async () => {
        if (!customerImage || !garmentImage) return;
        setIsLoading(true);
        setError(null);
        setStep(AppStep.PROCESSING);
        // Reset adjustments for a new try-on
        setOpacity(1);
        setLighting('original');
        setShowAdjustments(false);
        try {
            const result = await performVirtualTryOn(customerImage, garmentImage);
            setResultImage(result);
            setStep(AppStep.RESULT);
        } catch (e: unknown) {
            let errorMessage = "An unexpected error occurred during processing. Please try again.";
             if (e instanceof Error) {
                errorMessage = e.message; // Use the specific error from the service
            }
            setError(errorMessage);
            setStep(AppStep.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [customerImage, garmentImage]);

    const handleApplyAdjustments = useCallback(async () => {
        if (!customerImage || !garmentImage) return;
        setIsAdjusting(true);
        setError(null);
        try {
            const result = await performVirtualTryOn(customerImage, garmentImage, { opacity, lighting });
            setResultImage(result);
        } catch (e: unknown) {
            let errorMessage = "An unexpected error occurred during adjustment. Please try again.";
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            console.error("Adjustment failed:", errorMessage);
            alert(errorMessage); // Simple feedback for adjustment errors
        } finally {
            setIsAdjusting(false);
        }
    }, [customerImage, garmentImage, opacity, lighting]);

    const reset = () => {
        setCustomerImage(null);
        setGarmentImage(null);
        setResultImage(null);
        setError(null);
        setIsLoading(false);
        setShowAdjustments(false);
        setStep(AppStep.SELECT_CUSTOMER_SOURCE);
    };

    const handleSaveImage = useCallback(() => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = 'virtual-try-on-result.jpeg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [resultImage]);
    
    const renderPreview = (
        image: string, 
        title: string, 
        onRetake: () => void, 
        onConfirm: () => void,
        confirmLabel: string
    ) => (
        <div className="w-full h-full flex flex-col p-4 pt-20 bg-gray-800">
            <h2 className="text-xl text-center font-semibold mb-4">{title}</h2>
            <div className="flex-grow flex items-center justify-center mb-4" style={{ minHeight: 0 }}>
                <img src={image} alt="Capture preview" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
            <div className="flex gap-4">
                <button onClick={onRetake} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 ease-in-out active:scale-95">Retake</button>
                <button onClick={onConfirm} className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 ease-in-out active:scale-95 shadow-lg shadow-green-500/30 hover:shadow-xl">{confirmLabel}</button>
            </div>
        </div>
    );


    const renderContent = () => {
        switch (step) {
            case AppStep.SELECT_CUSTOMER_SOURCE:
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 pt-20 bg-gray-800 text-center">
                        <h2 className="text-2xl font-semibold mb-8">Provide a Customer Photo</h2>
                        <div className="w-full max-w-xs space-y-4">
                            <button 
                                onClick={() => customerCameraInputRef.current?.click()}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 text-lg transition-all duration-300 ease-in-out active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Use Camera
                            </button>
                            <button 
                                onClick={() => customerFileInputRef.current?.click()}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 text-lg transition-all duration-300 ease-in-out active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Upload from Device
                            </button>
                             <input 
                                type="file" 
                                ref={customerCameraInputRef} 
                                onChange={handleCustomerFileSelect} 
                                className="hidden" 
                                accept="image/*" 
                                capture="user"
                            />
                            <input 
                                type="file" 
                                ref={customerFileInputRef} 
                                onChange={handleCustomerFileSelect} 
                                className="hidden" 
                                accept="image/*" 
                            />
                        </div>
                    </div>
                );
            case AppStep.PREVIEW_CUSTOMER:
                 return customerImage && renderPreview(
                    customerImage, 
                    "Customer Photo", 
                    () => {
                        setCustomerImage(null);
                        setStep(AppStep.SELECT_CUSTOMER_SOURCE);
                    }, 
                    () => setStep(AppStep.SELECT_GARMENT_SOURCE),
                    "Confirm & Add Garment"
                );
            case AppStep.SELECT_GARMENT_SOURCE:
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 pt-20 bg-gray-800 text-center">
                        <h2 className="text-2xl font-semibold mb-8">Provide a Garment</h2>
                        <div className="w-full max-w-xs space-y-4">
                             <button 
                                onClick={() => garmentCameraInputRef.current?.click()}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 text-lg transition-all duration-300 ease-in-out active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-1"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Use Camera
                             </button>
                             <button 
                                onClick={() => garmentFileInputRef.current?.click()}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 text-lg transition-all duration-300 ease-in-out active:scale-95"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Upload from Device
                             </button>
                             <input 
                                type="file" 
                                ref={garmentCameraInputRef} 
                                onChange={handleGarmentFileSelect} 
                                className="hidden" 
                                accept="image/*" 
                                capture="environment"
                             />
                             <input 
                                type="file" 
                                ref={garmentFileInputRef} 
                                onChange={handleGarmentFileSelect} 
                                className="hidden" 
                                accept="image/*" 
                             />
                        </div>
                         <button onClick={() => setStep(AppStep.PREVIEW_CUSTOMER)} className="mt-8 text-gray-400 hover:text-white transition">Back</button>
                    </div>
                );
            case AppStep.PREVIEW_GARMENT:
                return (
                    <div className="w-full h-full flex flex-col p-4 pt-20 bg-gray-800">
                        <h2 className="text-xl text-center font-semibold mb-4 shrink-0">Ready to Try On?</h2>
                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 overflow-hidden">
                           <div className="relative bg-black/20 rounded-lg overflow-hidden">
                               {customerImage && <img src={customerImage} alt="Customer" className="absolute inset-0 w-full h-full object-contain p-2" />}
                           </div>
                           <div className="relative bg-black/20 rounded-lg overflow-hidden">
                               {garmentImage && <img src={garmentImage} alt="Garment" className="absolute inset-0 w-full h-full object-contain p-2" />}
                           </div>
                        </div>
                        <div className="flex gap-4 shrink-0">
                           <button onClick={() => {
                                setError(null);
                                setGarmentImage(null);
                                setStep(AppStep.SELECT_GARMENT_SOURCE);
                               }} className="flex-1 bg-gray-700 hover:bg-gray-600 font-bold py-3 rounded-xl transition-all duration-300 ease-in-out active:scale-95">Change Garment</button>
                           <button onClick={handleTryOn} disabled={isLoading} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-4 rounded-xl text-lg transition-all duration-300 ease-in-out active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-1 disabled:opacity-50">
                                TRY
                           </button>
                        </div>
                    </div>
                );
            case AppStep.PROCESSING:
                const spinnerMessages = [
                    "Analyzing customer photo...",
                    "Isolating the garment...",
                    "Compositing the new look...",
                    "Finalizing the image..."
                ];
                return <div className="w-full h-full flex items-center justify-center"><Spinner messages={spinnerMessages} /></div>;
            case AppStep.ERROR:
                 return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 pt-20 text-center bg-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-red-400 mb-2">Processing Failed</h2>
                        <p className="text-gray-300 mb-8 max-w-sm">{error || "An unknown error occurred."}</p>
                        <div className="w-full max-w-xs space-y-4">
                            <button onClick={handleTryOn} disabled={isLoading} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl text-lg transition-all duration-300 active:scale-95 shadow-lg shadow-blue-500/30">
                                Retry Last Attempt
                            </button>
                            <button onClick={reset} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 active:scale-95">
                                Start Over
                            </button>
                        </div>
                    </div>
                 );
            case AppStep.RESULT:
                return (
                    <div className="w-full h-full bg-black flex flex-col">
                        <div className="relative flex-grow flex items-center justify-center overflow-hidden p-4">
                            {resultImage && (
                                <img
                                    src={resultImage}
                                    alt="Virtual try-on result"
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300"
                                />
                            )}
                            {isAdjusting && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                                    <Spinner messages={["Applying adjustments..."]} />
                                </div>
                            )}
                        </div>
                        <div className="w-full p-4 bg-gradient-to-t from-black/80 to-transparent z-10 shrink-0 space-y-4">
                             {showAdjustments && (
                                <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 animate-fade-in-up">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg">Adjust Style</h3>
                                        <button onClick={() => setShowAdjustments(false)} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close adjustments">&times;</button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="opacity" className="block text-sm font-medium text-gray-300 mb-1">Opacity: {Math.round(opacity * 100)}%</label>
                                            <input id="opacity" type="range" min="0.5" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Lighting</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button onClick={() => setLighting('original')} className={`px-2 py-2 rounded-lg text-sm font-semibold transition ${lighting === 'original' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Original</button>
                                                <button onClick={() => setLighting('brighter')} className={`px-2 py-2 rounded-lg text-sm font-semibold transition ${lighting === 'brighter' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Brighter</button>
                                                <button onClick={() => setLighting('dimmer')} className={`px-2 py-2 rounded-lg text-sm font-semibold transition ${lighting === 'dimmer' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Dimmer</button>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={handleApplyAdjustments} disabled={isAdjusting} className="mt-4 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isAdjusting ? 'Applying...' : 'Apply Changes'}
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={reset}
                                    className="flex-1 bg-gray-200 hover:bg-gray-100 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 ease-in-out active:scale-95 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m7 11v-5h-5M4 9a9 9 0 0115-5.19M20 15a9 9 0 01-15 5.19" /></svg>
                                    Start Over
                                </button>
                                <button
                                    onClick={() => setShowAdjustments(!showAdjustments)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 ease-in-out active:scale-95 transform hover:-translate-y-1 flex items-center justify-center gap-2"
                                    aria-controls="adjustment-panel"
                                    aria-expanded={showAdjustments}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                                    Adjust
                                </button>
                                <button
                                    onClick={handleSaveImage}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 ease-in-out active:scale-95 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <main className="h-screen w-screen bg-gray-900 text-white font-sans antialiased">
            <div className="relative w-full h-full max-w-lg mx-auto bg-black">
                {installPrompt && (
                    <div className="absolute top-20 left-4 right-4 bg-gray-800 border border-gray-700 p-3 rounded-xl shadow-lg z-50 flex items-center justify-between gap-3 animate-fade-in-down">
                        <p className="text-white text-sm font-medium">Add to your Home Screen for easy access!</p>
                        <div className="flex-shrink-0">
                            <button onClick={handleInstallClick} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all duration-300 active:scale-95">Install</button>
                            <button onClick={() => setInstallPrompt(null)} className="ml-2 text-gray-400 hover:text-white text-2xl leading-none font-light" aria-label="Dismiss">&times;</button>
                        </div>
                    </div>
                )}
                 <style>{`
                    @keyframes fade-in-down {
                        0% { opacity: 0; transform: translateY(-10px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-down { animation: fade-in-down 0.3s ease-out; }
                     @keyframes fade-in-up {
                        0% { opacity: 0; transform: translateY(10px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-up { animation: fade-in-up 0.3s ease-out; }
                `}</style>
                {step !== AppStep.RESULT && step !== AppStep.ERROR && <Header />}
                {renderContent()}
            </div>
        </main>
    );
};

export default App;