import { createContext, useContext, useState } from 'react';

const FlasherContext = createContext();

let flashTimer;

export function useFlasher(){
    return useContext(FlasherContext)
}

export default function FlashContext({ children }) {
    const [flashMessage, setFlashMessage] = useState({});
    const [visible, setVisible] = useState(false);

    const flash = (message, type, duration = 3) => {
        if (flashTimer) {
            clearTimeout(flashTimer);
            flashTimer = undefined;
        }

        setFlashMessage({message, type});
        setVisible(true);

        if (duration) {
        flashTimer = setTimeout(hideFlash, duration * 1000);
        }
    };

    const hideFlash = () => {
        setVisible(false);
    };

    return (
        <FlasherContext.Provider value={{"flash": flash, "hideFlash": hideFlash, "flashMessage": flashMessage, "visible": visible}}>
            {children}
        </FlasherContext.Provider>
    );
}