import { useState, useEffect } from 'react'
import Container from 'react-bootstrap/Container'
import ReactMarkdown from 'react-markdown'
import smartquotes from 'smartquotes';

export default function AboutPage() {

    const aboutFile = 'about/about.md'
    const [aboutText, setAboutText] = useState('')

    useEffect(() => {
        fetch(aboutFile).then(res => res.text()).then(text => setAboutText(smartquotes(text)))
    },[])

    return (
        <Container className='about-container'>
            <ReactMarkdown children={aboutText} />
        </Container>
    );
}