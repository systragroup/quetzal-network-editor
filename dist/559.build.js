"use strict";(self.webpackChunkquetzal_network_editor=self.webpackChunkquetzal_network_editor||[]).push([[559],{81158:(t,e,a)=>{a.d(e,{Z:()=>i});var s=a(87537),n=a.n(s),o=a(23645),r=a.n(o)()(n());r.push([t.id,".layout[data-v-931a108a]{background-color:var(--v-white-base);display:flex;height:100%;width:100%;align-items:center;flex-direction:column;overflow-y:scroll;padding-top:15px;padding-bottom:60px}.card[data-v-931a108a]{width:80%;margin:10px}","",{version:3,sources:["webpack://./src/pages/ResultTable.vue"],names:[],mappings:"AAGA,yBACE,oCAAA,CACA,YAAA,CACA,WAAA,CACA,UAAA,CACA,kBAAA,CACA,qBAAA,CACA,iBAAA,CACA,gBAAA,CACA,mBAAA,CAEF,uBACE,SAAA,CACA,WAAA",sourcesContent:['@import "@scss/variables.scss";\n\n\n.layout {\n  background-color:var(--v-white-base);\n  display: flex;\n  height: 100%;\n  width:100%;\n  align-items: center;\n  flex-direction: column;\n  overflow-y: scroll;\n  padding-top: 15px;\n  padding-bottom: 60px;\n}\n.card {\n  width:80%;\n  margin: 10px;\n}\n\n'],sourceRoot:""}]);const i=r},88559:(t,e,a)=>{a.r(e),a.d(e,{default:()=>y});var s=function(){var t=this,e=t._self._c;return e("section",{staticClass:"layout"},[0===t.tables.length?e("p",[t._v("\n    "+t._s(t.$gettext(t.message))+"\n  ")]):t._e(),t._v(" "),t._l(t.tables,(function(a,s){return e("v-card",{key:s,staticClass:"card"},[e("v-data-table",{staticClass:"elevation-3",attrs:{headers:a.headers,height:a.data.length>=10?"35rem":"auto","fixed-header":"","fixed-footer":"",items:a.data,"items-per-page":10,"footer-props":{"items-per-page-options":a.data.length<=500?[10,20,100,200,-1]:[10,20,100,200,500]}},scopedSlots:t._u([{key:"top",fn:function(){return[e("v-toolbar",{attrs:{flat:""}},[e("v-toolbar-title",[t._v(t._s(a.name))]),t._v(" "),e("v-spacer")],1)]},proxy:!0}],null,!0)})],1)}))],2)};s._withStripped=!0;var n=a(60887),o=a(76955);const r={name:"ResultTable",components:{},data:()=>({tables:[],message:""}),watch:{},async created(){this.$store.commit("changeLoading",!0);const t=await this.getCSV();for(const e of t){const t=e.path.slice(0,-4),a=(0,o.JO)(e.content),s=[];Object.keys(a[0]).forEach((t=>s.push({text:t,value:t,width:"1%"}))),this.tables.push({headers:s,data:a,name:t})}this.$store.commit("changeLoading",!1),0===this.tables.length&&(this.message="Nothing to display")},methods:{async getCSV(){const t=this.$store.getters.scenario+"/",e=this.$store.getters.otherFiles.filter((t=>t.path.endsWith(".csv")));for(const a of e)a.content instanceof Uint8Array||(a.content=await n.Z.readBytes(this.$store.getters.model,t+a.path));return e}}};var i=a(93379),l=a.n(i),c=a(7795),A=a.n(c),d=a(90569),h=a.n(d),p=a(3565),u=a.n(p),g=a(19216),m=a.n(g),C=a(44589),v=a.n(C),f=a(81158),b={};b.styleTagTransform=v(),b.setAttributes=u(),b.insert=h().bind(null,"head"),b.domAPI=A(),b.insertStyleElement=m(),l()(f.Z,b),f.Z&&f.Z.locals&&f.Z.locals;const y=(0,a(51900).Z)(r,s,[],!1,null,"931a108a",null).exports}}]);
//# sourceMappingURL=559.build.js.map