let stars = 900;
let size = {min: 1, max: 4}

document.write("<a class='star'></a>".repeat(stars));

for (let i = 0; i < document.getElementsByClassName('star').length; i++) {
    document.getElementsByClassName('star')[i].style.top = Math.random()*100 + 'vh';
    document.getElementsByClassName('star')[i].style.left = Math.random()*100 + 'vw';
    document.getElementsByClassName('star')[i].style.width =
        (Math.random()*(size.max-size.min)+size.min)/10 + 'vmin';
    document.getElementsByClassName('star')[i].style.height =
        document.getElementsByClassName('star')[i].style.width;
}
