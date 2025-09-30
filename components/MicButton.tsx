import React from 'react';

type SessionState = 'idle' | 'connecting' | 'active' | 'error';

interface MicButtonProps {
    sessionState: SessionState;
    isProcessing: boolean;
    onClick: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({ sessionState, isProcessing, onClick }) => {
    
    const getButtonStateClasses = () => {
        if (sessionState === 'active' && isProcessing) {
            return 'bg-brand-processing animate-pulse shadow-purple-500/50';
        }

        switch (sessionState) {
            case 'active':
                return 'bg-red-500 animate-pulse-slow shadow-red-500/50';
            case 'connecting':
                return 'bg-yellow-500 animate-pulse shadow-yellow-500/50';
            case 'error':
                 return 'bg-gray-600 shadow-gray-400/50';
            case 'idle':
            default:
                return 'bg-brand-primary hover:bg-blue-600 shadow-blue-500/50';
        }
    }

    const renderIcon = () => {
        // Quando estiver processando, exiba um ícone de spinner para feedback claro.
        if (sessionState === 'active' && isProcessing) {
            return (
                <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            );
        }

        // Quando estiver ativo (ouvindo) ou conectando, exiba um ícone de parar.
        if (sessionState === 'active' || sessionState === 'connecting') {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                   <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                </svg>
            );
        }

        // Quando inativo ou em erro, exiba o ícone de microfone para iniciar.
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        );
    };

    return (
        <button
            onClick={onClick}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg ${getButtonStateClasses()}`}
            aria-label={sessionState === 'active' ? 'Parar sessão' : 'Iniciar sessão'}
            disabled={sessionState === 'connecting'}
        >
            {renderIcon()}
        </button>
    )
}