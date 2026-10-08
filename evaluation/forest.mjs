// Small deterministic random forest. Labels enter fitForest only; inference
// receives feature vectors. Source-group splitting happens before this module.
function random(seed){let state=seed>>>0;return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};}
const distribution=rows=>{const n=[1,1,1];for(const row of rows)n[row.y]++;const total=n.reduce((a,b)=>a+b,0);return n.map(x=>x/total);};
const impurity=rows=>{const n=[0,0,0];for(const row of rows)n[row.y]++;return rows.length?1-n.reduce((s,c)=>s+(c/rows.length)**2,0):0;};
export function fitForest(rows,{trees=48,maxDepth=4,minLeaf=6,featureCount=5,seed=10937}={}){
 if(!rows.length)throw Error('No forest training rows');const rng=random(seed),dim=rows[0].x.length;
 function grow(data,depth){
  const probabilities=distribution(data);if(depth>=maxDepth||data.length<minLeaf*2||impurity(data)===0)return{probabilities};
  const features=Array.from({length:dim},(_,i)=>i);for(let i=features.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[features[i],features[j]]=[features[j],features[i]];}
  let best=null;
  for(const feature of features.slice(0,featureCount)){
   const values=data.map(r=>r.x[feature]).sort((a,b)=>a-b),thresholds=[...new Set([.2,.4,.6,.8].map(q=>values[Math.floor((values.length-1)*q)]))];
   for(const threshold of thresholds){const left=data.filter(r=>r.x[feature]<=threshold),right=data.filter(r=>r.x[feature]>threshold);if(left.length<minLeaf||right.length<minLeaf)continue;
    const loss=(left.length*impurity(left)+right.length*impurity(right))/data.length;
    if(!best||loss<best.loss)best={feature,threshold,left,right,loss};
   }
  }
  if(!best||best.loss>=impurity(data)-1e-8)return{probabilities};
  return{feature:best.feature,threshold:best.threshold,left:grow(best.left,depth+1),right:grow(best.right,depth+1)};
 }
 const forest=Array.from({length:trees},()=>grow(Array.from({length:rows.length},()=>rows[Math.floor(rng()*rows.length)]),0));
 return{type:'deterministic-random-forest',trees:forest,trainingConfig:{trees,maxDepth,minLeaf,featureCount,seed},trainingRows:rows.length};
}
export function forestScores(vector,model){
 const scores=[0,0,0];for(const root of model.trees){let node=root;while(!node.probabilities)node=vector[node.feature]<=node.threshold?node.left:node.right;for(let c=0;c<3;c++)scores[c]+=node.probabilities[c]/model.trees.length;}
 return scores;
}
