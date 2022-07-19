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
  const [scoreSelection, setScoreSelection] = useState("At/Above Bar");
  const [lowRange, setLowRange] = useState(0);
  const [highRange, setHighRange] = useState(5.1);
  const [adminConflicts, setAdminConflicts] = useState("Never");
  const [queueExplicitList, setQueueExplicitList] = useState("");
  const [bar, setBar] = useState(0);

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
        "adminConflicts": adminConflicts,
        "setAdminConflicts": setAdminConflicts,
        "queueExplicitList": queueExplicitList,
        "setQueueExplicitList": setQueueExplicitList,
        "bar": bar,
        "setBar": setBar
    }}>
        {children}
    </GUIFiltersContext.Provider>
  )
}