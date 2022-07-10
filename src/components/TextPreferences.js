import {DropdownButton, Dropdown} from "react-bootstrap"
import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import {useChangeFontSize, useFontSize} from '../contexts/PreferencesContext'

export default function TextPreferences(){
    let fontSize = useFontSize()
    let changeFontSize = useChangeFontSize()

    return(
        <Container>
            <h3>Text Preferences</h3>
            <Stack direction="horizontal">
                <h5>Choose font size</h5>
                <DropdownButton id="dropdown-item-button" title={fontSize} className="font-size-dropdown">
                    <Dropdown.Item as="button" onClick={() => changeFontSize("Small")}>Small</Dropdown.Item>
                    <Dropdown.Item as="button" onClick={() => changeFontSize("Medium")}>Medium</Dropdown.Item>
                    <Dropdown.Item as="button" onClick={() => changeFontSize("Large")}>Large</Dropdown.Item>
                </DropdownButton>
            </Stack>
        </Container>
    )
}