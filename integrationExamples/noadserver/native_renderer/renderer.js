window.renderAd = function (data) {
  data = Object.fromEntries(data.map(({key, value}) => [key, value]));
  return `
    <style>
        body {
            display: inline-block;
        }

        .container {
            display: inline-block;
            font-family: "Helvetica Neue",Helvetica,Arial,sans-serif;
            font-size: 14px;
            line-height: 1.42857143;
            color: #333;
            background: #fff url(${data.image}) no-repeat center;
            background-size: cover;
        }


        .card {
            border: 4px solid #ffd724;
            display: inline-block;
            padding: 20px;
            height: 300px;
            width: 320px;
        }


        h1 a:link, a:active, a:visited, a:hover, a:focus {
            text-decoration: none;
            color: #fff;
        }

        h1 {
            line-height: 1.3;
            color: #fff;
            font-size: 26px;
            background-color: rgba(0, 0, 0, 0.7);
            display: inline;
            font-family: Roboto, serif;
            font-weight: 100;
        }

        .attribution {
            color: #fff;
            display: inline-block;
            letter-spacing: 2px;
            background-color: #ffd724;
            font-size: 12px;
            line-height: 1;
            padding: 6px 6px 0 6px;
            height: 24px;
            margin: 5px 0 10px 0;
            border-radius: 4px;
        }
    </style>
    <div class="container">
        <div class="card">
            <div class="title">
                <h1>
                    <a href="${data.clickUrl}" target="_blank">${data.title}</a>
                </h1>
            </div>
            <div class="attribution">
                ${data.sponsoredBy}
            </div>
        </div>
    </div>`;
};
