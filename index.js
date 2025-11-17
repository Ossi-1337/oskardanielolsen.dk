setInterval(() => {
    arr = [".", ". .", ". . ."];
    const title = document.title;
    let index = arr.indexOf(title);
    if (index === arr.length - 1) {
        index = 0;
    } else {
        index++;
    }
    document.title = arr[index];
}, 1000);

let rotate_amount = 360 / 500;
let current_angle = 0;

setInterval(() => {
    current_angle += rotate_amount;
    if (current_angle >= 360) {
        current_angle = 0;
    }
    document.querySelector('.rotating-text').style.transform = `rotate(${current_angle}deg)`;
}, 1);
