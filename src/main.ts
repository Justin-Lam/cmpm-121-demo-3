import "./style.css";
const APP_NAME: string = "Geocoin GO";
const app: HTMLDivElement = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;

const testButton = document.createElement("button");
testButton.innerHTML = "Click me!";
testButton.addEventListener("click", () => {
  alert("You clicked the button!");
});
app.append(testButton);
