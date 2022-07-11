import {DropdownButton, Dropdown} from "react-bootstrap"
import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import {useChangeFontSize, useFontInfo} from '../contexts/PreferencesContext'

export default function TextPreferences(){
    let fontInfo = useFontInfo()
    let changeFontSize = useChangeFontSize()

    return(
        <Container>
            <h3>Text Preferences</h3>
            <Stack direction="horizontal">
                <h5>Choose font size</h5>
                <DropdownButton id="dropdown-item-button" title={fontInfo["currentFontSize"]} className="font-size-dropdown">
                    {
                        Object.keys(fontInfo["fontSizes"]).map((fontSizeKey) => {
                            return <Dropdown.Item as="button" onClick={() => changeFontSize(fontSizeKey)}>{fontSizeKey}</Dropdown.Item>
                        })
                    }
                </DropdownButton>
            </Stack>
        </Container>
    )
}