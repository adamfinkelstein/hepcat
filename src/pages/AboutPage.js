import Container from 'react-bootstrap/Container'
import ReactMarkdown from 'react-markdown'
import {useAppGlobals} from '../contexts/AppContext'

export default function AboutPage() {
    const globals = useAppGlobals();
    const aboutMD = globals.aboutMD;
    const controlledLog = globals.controlledLog
    let imageURLprefix = process.env.REACT_APP_ABOUT_IMAGE_PREFIX
    if (!imageURLprefix) imageURLprefix = 'https://hepcat.herokuapp.com/about'
    controlledLog('In about page')
    controlledLog(process.env)

    // const aboutFile = 'about/about.md'
    // const [aboutText, setAboutText] = useState('')

    // useEffect(() => {
    //     fetch(aboutFile).then(res => res.text()).then(text => setAboutText((text))).catch(() =>  setAboutText("error"))
    // },[])

    return (
        <Container className='about-container'>
            <ReactMarkdown 
              transformImageUri={uri =>
                // this fixes urls for local images
                uri.startsWith("http") ? uri : `${imageURLprefix}/${uri}`
              }
            children={aboutMD} />
        </Container>
    );
}