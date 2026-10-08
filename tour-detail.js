const progress=document.querySelector('.progress');
const updateProgress=()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=`${max>0?scrollY/max*100:0}%`};
addEventListener('scroll',updateProgress,{passive:true});updateProgress();
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.fade').forEach(el=>observer.observe(el));
document.querySelectorAll('[data-fallback]').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.tried)return;img.dataset.tried='1';img.src=img.dataset.fallback}));
