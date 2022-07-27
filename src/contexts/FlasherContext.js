import { createContext, useContext, useState } from 'react';

const FlasherContext = createContext();

let flashTimer;

export function useFlasher(){
    return useContext(FlasherContext)
}

export default function FlashContext({ children }) {
    const noneVisible = {
        "stickie": false, 
        "hide_queue": false, 
        "set_queue": false, 
        "set_explicit": false, 
        "change_bar": false, 
        "favorites": false,
        "change_password": false,
        "colors": false};

    const [flashMessage, setFlashMessage] = useState({});
    const [visible, setVisible] = useState(noneVisible);

    const flash = (message, type, which) => {
        const duration = 4
        if (flashTimer) {
            clearTimeout(flashTimer);
            flashTimer = undefined;
        }

        setFlashMessage({message, type});
        setVisible(() => {
            let copyVisible = { ...noneVisible };
            copyVisible[which] = true;              
            return copyVisible;
        })

        if (duration) {
            flashTimer = setTimeout(hideFlash, duration * 1000);
        }
    };

    const hideFlash = () => {
        setVisible(noneVisible)
    };

    return (
        <FlasherContext.Provider value={{"flash": flash, "hideFlash": hideFlash, "flashMessage": flashMessage, "visible": visible}}>
            {children}
        </FlasherContext.Provider>
    );
}