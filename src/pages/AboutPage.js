import Container from 'react-bootstrap/Container'
import ReactMarkdown from 'react-markdown'
import {useAppGlobals} from '../contexts/AppContext'

export default function AboutPage() {
    const globals = useAppGlobals();
    const aboutMD = globals.aboutMD;
    const controlledLog = globals.controlledLog
    let imageURLprefix = process.env.REACT_APP_ABOUT_IMAGE_PREFIX
    if (!imageURLprefix) imageURLprefix = 'https://hepcat.herokuapp.com/about/'

    // This could be used to detect load and then only get MD after that.
    // import {useRef, useEffect} from 'react'
    // const ref = useRef();
    // useEffect(() => {
    //   // Check if the component is visible
    //   if (ref.current && ref.current.isVisible) {
    //     // Render the component
    //     ref.current.render();
    //     console.log('Render About page')
    //   }
    // }, [ref]);
    
    const fixImageURL = (url) => {
      controlledLog('before: '+url)
      const after = url.startsWith("http") ? url : imageURLprefix + url
      controlledLog('after: '+after)
      return after
    }

    return (
        <Container className='about-container'>
            <ReactMarkdown 
              transformImageUri={fixImageURL}
              children={aboutMD} />
        </Container>
    );
}