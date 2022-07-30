import React, {useState, useContext} from 'react'

const GUIFiltersContext = React.createContext()

export function useGUI(){
  return useContext(GUIFiltersContext)
}
export default function GUIContext({children}){
  const [statusCheckbox, setStatusCheckbox] = useState([]);
  const [onlyCheckbox, setOnlyCheckbox] = useState([]);
  const [message, setMessage] = useState("");
  const [hideQ, setHideQ] = useState(false);
  const [scoreSelection, setScoreSelection] = useState("In Range"); // default matches SetQueue.js
  const [lowRange, setLowRange] = useState(0);
  const [highRange, setHighRange] = useState(5.1);
  const [queueExplicitList, setQueueExplicitList] = useState("");

  return(
    <GUIFiltersContext.Provider value={{
        "statusCheckbox": statusCheckbox,
        "setStatusCheckbox": setStatusCheckbox,
        "onlyCheckbox": onlyCheckbox,
        "setOnlyCheckbox": setOnlyCheckbox,
        "message": message,
        "setMessage": setMessage,
        "hideQ": hideQ,
        "setHideQ": setHideQ,
        "scoreSelection": scoreSelection,
        "setScoreSelection": setScoreSelection,
        "lowRange": lowRange,
        "setLowRange": setLowRange,
        "highRange": highRange,
        "setHighRange": setHighRange,
        "queueExplicitList": queueExplicitList,
        "setQueueExplicitList": setQueueExplicitList,
    }}>
        {children}
    </GUIFiltersContext.Provider>
  )
}