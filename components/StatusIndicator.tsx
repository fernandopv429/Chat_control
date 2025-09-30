
import React from 'react';

interface StatusIndicatorProps {
    statusText: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ statusText }) => {
    return (
        <p className="text-brand-text-secondary text-center h-5">
            {statusText}
        </p>
    );
};
