// this file is autogenerated, see creative/README.md
export const RENDERER = "!function(){\"use strict\";var e=JSON.parse('{\"FP\":{\"h0\":\"adRenderFailed\",\"gV\":\"adRenderSucceeded\"},\"q_\":{\"Ex\":\"noAd\"},\"X3\":{\"Ks\":\"Prebid Event\"}}');const d=e.X3.Ks,n=e.FP.gV,s=e.FP.h0,i=e.q_.Ex;window.render=function({ad:e,adUrl:r,width:a,height:t},{sendMessage:o,mkFrame:c},h){if(e||r){const s=h.document,i={width:a,height:t};r&&!e?i.src=r:i.srcdoc=e,s.body.appendChild(c(s,i)),o(d,{event:n})}else o(d,{event:s,info:{reason:i,message:\"Missing ad markup or URL\"}})}}();"