const { ipcRenderer } = require("electron");
const s = {
  "address": document.querySelector("#input"),
  "headers": document.querySelector("#headers .input-1"),
  "body": document.querySelector("#body .input-1"),
  "options": document.querySelector("#options .input-1"),
  "dropdown": {
    "button": document.querySelector(".dropdown > button"),
    "ul": document.querySelector(".dropdown > ul")
  }
};
let method = "GET";

if (localStorage.getItem("cancel")) {
  const items = JSON.parse(localStorage.getItem("cancel"));
  s.address.value = items.address;
  s.headers.innerText = items.headers == '{}' ? "" : items.headers;
  s.body.innerText = items.body == '{}' ? "" : items.body;
  s.options.innerText = items.options;
  localStorage.removeItem("cancel");
}

// IPC Renderers

ipcRenderer.on("example", (e, t, ...params) => {
  if (t == "try") {
    s.address.value = "https://jsonplaceholder.typicode.com/todos/1";
  } else if (t == "delay") {
    s.address.value = params[0] + '/delay-test';
  }
  method = "GET";
  sendRequest();
});

// Dropdown

s.dropdown.button.addEventListener("click", () => {
  if (s.dropdown.ul.classList.contains("active")) {
    s.dropdown.ul.classList.remove("active");
  } else {
    s.dropdown.ul.classList.add("active");
  }
});

function setMethod(t) {
  method = t;
  document.querySelector(".dropdown > button .name").innerText = t;
  s.dropdown.ul.classList.remove("active");
}

// Tabs

function setTab(id, current) {
  const element = document.querySelector(`#${id}`);
  var parent = element.parentNode;
  var siblings = Array.from(parent.children);
  siblings = siblings.filter(function (sibling) {
    return sibling !== element;
  });
  siblings.forEach(function (sibling) {
    sibling.classList.remove("active");
  });

  var panel = current.parentNode;
  var buttons = Array.from(panel.children);
  buttons = buttons.filter(function (button) {
    return button !== current;
  });
  buttons.forEach(function (button) {
    button.classList.remove("active");
  });
  element.classList.add("active");
  current.classList.add("active");
}

// Export fetch request code

function getCode() {
  fetch("/fetch?code=true", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(getData()),
  })
    .then((res) => res.json())
    .then((response) => {
      document.querySelector("#code > .input-2").innerText = response.code;
    });
}

// Send request

function sendRequest() {
  document.querySelector(".raw-content").innerHTML = `
<div class="sending">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path fill="#fff" d="M440-183v-274L200-596v274l240 139Zm80 0 240-139v-274L520-457v274Zm-40-343 237-137-237-137-237 137 237 137ZM160-252q-19-11-29.5-29T120-321v-318q0-22 10.5-40t29.5-29l280-161q19-11 40-11t40 11l280 161q19 11 29.5 29t10.5 40v318q0 22-10.5 40T800-252L520-91q-19 11-40 11t-40-11L160-252Zm320-228Z"/></svg>
<h1>Sending...</h1>
</div>
`;
  document.querySelector(".status-p").innerText = "Sending...";

  const info = getData();

  document.querySelector("#send").classList.add("danger");
  document.querySelector("#send").innerText = "Cancel";
  document.querySelector("#send").addEventListener("click", cancelRequest);

  fetch("/fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(info),
  })
    .then((r) => r.json())
    .then((response) => {
      const data = response.result;
      try {
        const jsonData = JSON.parse(data);
        document.querySelector(".raw-content").innerText = JSON.stringify(
          jsonData,
          null,
          4,
        );
        const jsonString = JSON.stringify(jsonData, null, 4);

        const highlightedJson = jsonString.replace(
          /("[^"]*")|(:\s*("[^"]*"))|(\{)|(\})|(:)/g,
          function (match, p1, p2, p3, p4, p5, p6) {
            if (p1) return `<span style="color: #7EA1FF;">${p1}</span>`;
            else if (p3)
              return `<span style="color: #FEEFAD;"><span style="color: #F27BBD;">:</span> ${p3}</span>`;
            else if (p4 || p5)
              return `<span style="color: #F97300;">${p4 || p5}</span>`;
            else if (p6) return `<span style="color: #F27BBD;">${p6}</span>`;
          },
        );

        document.querySelector(".raw-content").innerHTML = highlightedJson;

        if (
          jsonData.hasOwnProperty("errorFromFetcharoni") &&
          jsonData["errorFromFetcharoni"] == true
        ) {
          disableCancel();
          document.querySelector(".status-p").innerText = "Failed";
          return;
        }
      } catch (e) {
        document.querySelector(".raw-content").innerText = data;
      }

      document.querySelector(".status-p").innerHTML =
        response.time +
        " • " +
        response.size +
        " • " +
        formatStatusCode(Number(response.status));
      document.querySelector("#headers-out .input-1").innerHTML = null;

      for (const [key, value] of Object.entries(response.headers)) {
        document.querySelector("#headers-out .input-1").innerHTML += `<div>"${key}": "${value}"</div>`;
      }

      const htmlLoad = document.querySelector("#render-iframe");
      const rawhtml = document.querySelector("#html-iframe");

      htmlLoad.contentDocument.open();
      var regex = /<link\s+rel="stylesheet"\s+href="(?!https:\/\/).*?"\s*\/>/g;
      function replaceHttps(match) {
        return match.replace('href="', `href="${data.address}`);
      }
      var regex2 = /<script[^>]+src="(?!https:\/\/).*?"[^>]*><\/script>/g;
      function replaceScript(match) {
        return match.replace('src="', `src="${data.address}`);
      }
      htmlLoad.contentDocument.write(
        data.replace(regex2, replaceScript).replace(regex, replaceHttps),
      );
      htmlLoad.contentDocument.close();
      rawhtml.contentDocument.open();
      rawhtml.contentDocument.write(data);
      rawhtml.contentDocument.close();
      disableCancel();
    });
}

// Cancel request and disable cancel button

function cancelRequest() {
  localStorage.setItem("cancel", JSON.stringify(getData()));
  window.location.reload();
}

function disableCancel() {
  document.querySelector("#send").classList.remove("danger");
  document.querySelector("#send").innerText = "Send";
  document.querySelector("#send").removeEventListener("click", cancelRequest);
}

// Utility functions

function getData() {
  return {
    address: document.querySelector("#input").value,
    headers: "{" + document.querySelector("#headers .input-1").innerText + "}",
    body: "{" + document.querySelector("#body .input-1").innerText + "}",
    options: document.querySelector("#options .input-1").innerText,
    method,
  };
}

function formatStatusCode(statusCode) {
  let color;
  let statusMessage;

  switch (Math.floor(statusCode / 100)) {
    case 1:
      color = "#FFC55A";
      statusMessage = "(Informational)";
      break;
    case 2:
      color = "#8DECB4";
      statusMessage = "(Success)";
      break;
    case 3:
      color = "#FF204E";
      statusMessage = "(Redirection)";
      break;
    case 4:
      color = "#E59BE9";
      statusMessage = "(Client Error)";
      break;
    case 5:
      color = "#5AB2FF";
      statusMessage = "(Server Error)";
      break;
    default:
      color = "#FF204E";
      statusMessage = "(Unknown)";
      break;
  }

  return `<span style="color: ${color};">${statusCode}</span> ${statusMessage}`;
}
