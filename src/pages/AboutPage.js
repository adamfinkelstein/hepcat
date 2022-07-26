import { useState, useEffect } from 'react'
import Container from 'react-bootstrap/Container'
import ReactMarkdown from 'react-markdown'
import {useAppGlobals} from '../contexts/AppContext'
import smartquotes from 'smartquotes';

export default function AboutPage() {
    const globals = useAppGlobals();
    const aboutMD = globals.aboutMD;

    // const aboutFile = 'about/about.md'
    // const [aboutText, setAboutText] = useState('')

    // useEffect(() => {
    //     fetch(aboutFile).then(res => res.text()).then(text => setAboutText((text))).catch(() =>  setAboutText("error"))
    // },[])

    return (
        <Container className='about-container'>
            <ReactMarkdown children={aboutMD} />
        </Container>
    );
}