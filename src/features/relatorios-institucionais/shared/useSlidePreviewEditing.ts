import {useEffect,useRef,useState} from 'react';
import type {SlideEdits,SlideTextElement} from './SlidePreviewEditor';
export function useSlidePreviewEditing(revision:unknown){
  const [edits,setEdits]=useState<SlideEdits>({}),[enabled,setEnabled]=useState(false),[elements,setElements]=useState<SlideTextElement[]>([]),[selected,setSelected]=useState('');
  const previous=useRef(revision);
  useEffect(()=>{if(previous.current!==revision){previous.current=revision;setEdits({});setEnabled(false);setSelected('');}},[revision]);
  return {edits,setEdits,enabled,setEnabled,elements,setElements,selected,setSelected};
}
