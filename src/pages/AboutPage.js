import { useState, useEffect } from 'react'
import Container from 'react-bootstrap/Container'
import ReactMarkdown from 'react-markdown'

export default function AboutPage() {

    const aboutFile = 'about.md'
    const [aboutText, setAboutText] = useState('')

    useEffect(() => {
        fetch(aboutFile).then(res => res.text()).then(text => setAboutText(text))
    },[])

    return (
        <Container className='about-container'>
            <ReactMarkdown children={aboutText} />
        </Container>
    );
}