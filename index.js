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