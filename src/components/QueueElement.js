import {useGlobals, useQueue} from '../contexts/AppContext'
import {useRef, useState, useEffect} from 'react'
import Container from 'react-bootstrap/Container'
import Stack from 'react-bootstrap/Stack'
import Chevron from './Chevron.js'
import PaperConflict from './PaperConflict'

export default function QueueElement({paper, active, toggleActive}){

    const queue = useQueue()
    const globals = useGlobals()
    const content = useRef(null);
    const index = paper.queue_order - 1

    function toggleExpand() {
        toggleActive(index)
    }

    return(
        <Container onClick={() => {
            globals.setUserCurrent(index)
            if(!active){
                toggleExpand()
            }
        }}>
            <Stack direction="horizontal" className="queue-element-container">
                <div>
                    <span className="accordion_title">Q{paper.queue_order}: {paper.title}</span>
                </div>
                <button className={`accordion ${active}`} onClick={toggleExpand}>
                    <Chevron className={`${ active === "" ? "accordion_icon" : "accordion_icon rotate"}`} width={10} fill={"#777"} />
                </button>
            </Stack>
            <div ref={content} style={{ maxHeight: `${(active === "" || content === null) ? "0px" : `${content.current.scrollHeight}px`}` }} className="accordion_content">
                <div className="accordion_text">
                    <PaperConflict conflicts={paper.conflicts}></PaperConflict>
                </div>
            </div>
        </Container>
    )
}