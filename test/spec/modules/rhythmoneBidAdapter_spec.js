import {spec} from '../../../modules/rhythmoneBidAdapter';
var assert = require('assert');

describe('rhythmone adapter tests', function () {
  describe('auditBeacon', function() {
    var z = spec;
    var beaconURL = z.getUserSyncs({pixelEnabled: true})[0];

    it('should contain the correct path', function() {
      var u = '//hbevents.1rx.io/audit?'
      assert.equal(beaconURL.url.substring(0, u.length), u);
    });
  });

  describe('rhythmoneResponse', function () {
    var z = spec;

    var rmpRequest = z.buildRequests(
      [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'xyz',
            'keywords': '',
            'categories': [],
            'trace': true,
            'method': 'get',
            'endpoint': 'http://fakedomain.com'
          },
          'mediaType': 'video',
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'sizes': [[300, 250]]
        }
      ]
    );

    it('should have one request to RMP', function() {
      assert.equal(rmpRequest.length, 1);
    });

    var mangoRequest = z.buildRequests(
      [
        {
          'bidder': 'rhythmone',
          'params': {
            'placementId': 'xyz',
            'keywords': '',
            'categories': [],
            'trace': true,
            'method': 'get',
            'api': 'mango',
            'endpoint': 'http://fakedomain.com'
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'sizes': [[300, 250]]
        }
      ]
    );

    it('should have one request to Mango', function() {
      assert.equal(mangoRequest.length, 1);
    });

    it('should send GDPR Consent data to RhythmOne tag', function () {
	  let _consentString = 'testConsentString';
	  var request = z.buildRequests(
        [
          {
            'bidder': 'rhythmone',
            'params': {
              'placementId': 'xyz',
              'keywords': '',
              'categories': [],
              'trace': true,
              'method': 'get',
              'api': 'mango',
              'endpoint': 'http://fakedomain.com?'
            },
            'adUnitCode': 'div-gpt-ad-1438287399331-0',
            'sizes': [[300, 250]]
          }
        ], {gdprConsent: {gdprApplies: 1, consentString: _consentString}}
      );
      assert.equal(getURLParam(request[0].url, 'gdpr'), 'true');
      assert.equal(getURLParam(request[0].url, 'gdpr_consent'), 'testConsentString');
    });

    var bids = z.interpretResponse({
      body: [
        {
          'impid': 'div-gpt-ad-1438287399331-0',
          'w': 300,
          'h': 250,
          'adm': '<div style=\"width:298px;height:248px; background-image: url(\'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAdQAAABuCAYAAACeAeLLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAABfLSURBVHhe7Z3Lrh3HdYb5BtIoUwqI5xKSBxDzBOQTRHyABOTcBnTG8YAcxiNxFs/EiT0VB/FYCAQYMCCAiAEBAgRIok1LlqxkB9/GKaZOndVdq2592/8H/BCos7uqunfv+nutuvSd0w759NNPT8+ePTtdXV2dHj58eLp3797pnXfeOb3//vvXn7jNJ598crpz5875s+jx48fn458/f356+fLl9aeEEEKIOnZhqJge5ocRYopT8hjqlN5+++1z+dSDYQshhBAlbNJQv/nmm3ME+uDBA9P8ptRiqKkwWKJfzJz2CCGEEHNsylAxr1ITjdXTUFNhrpQhhBBCWKxuqIxfkmZlDNQyshKNNNQg2vn06VNFrUIIIW6wmqFiSER9lmnVaglDDSIlzIOAjFUIIQQsbqgYEEaEIVlG1aIlDTVIxiqEEAIWNVRSpSOMNGgNQw0iFfzxxx9f1yaEEOLSWMRQWYaSW/LSQ2saahCTqrSuVQghLo/hhko61DKe3sJMHz16dF3rbTC5+/fvnz939+5ds4xeIgonGhdCCHE5DDNUDOy9994zDadFmOEHH3xwevLkyTnqbIHI+aOPPjqX9+6775r1tYhoVWOrQghxGQwxVIyu51gpkSUGOjqVivlhsNRntaNGjK1q5yUhhDg+3Q21V4qXiBFzWyvCC+baK3KlLCGEEMelq6H2WFdK+rU1ldsbIkzaZbW3RGzIL4QQ4ph0MVSiuZYtAxGGtfXZsbSv1Vh56BBCCHE8mg0VM22ZfMSs260baQrtpd3W+XikyUpCCHE8mgy1xUzfeuut3W+EwLgo52GdX06YqhBCiOPQZKi1Zsos2qNEaJxH7axgpX+FEOI4VBtqzQQkormjznblvKxzzkmmKoQQx6DKUGvMlA0Zjr4ek/Or2YXpww8/vC5BCCHEXik21JpIjLWclzIJh/OsWbuqjfWFEGLfFBkqEVjpDkhHGi/1UjOuynXd22xnIYQQ/4/bUDEJttGzzGBKrNm8ZErXrDLJ69IePoQQ4ii4DbV044ZLN9NAqanOvTFHCCHEdnEZKuN7Vuc/pbn3kl4ipWOqW9t6UQghRJ6soZamei9pApIXrkeJqXK9hRBC7IusoZKCtDp9S6wz7TGx5rPvfzr97nVe//3D/1wfcRPa8OLFi6yWXMZDm0p2VdJSGiGE2Bezhkrq0ersp9QrVXn/8z+f/u6/vs3q3778/vqIm2BGVvumxGQg3gQz2mBLU+ea9SuEEPth1lDv3btndvSWekZUSxtqLNKtz549uy6pPyVt08QuIYTYD5OGWhKdMj7YkzUNNQhjHbXZQsl46tF3lxJC9CcMi/321d9Ov/zyr2/Ev8Pfvv3pf68/LXoxaagl0WnvTn8Lhho04lVrXC+rLkt8D0tjtaNVnEfQ06dPq+8Zz4Nez2yJuEnutYWa4b8OGOUvvvj+9ODz12ZfOaV/+sOfT//6x+9Ov/76RxlsB0xDLRnrG9F5/eyzV+aXn2oJQ0VEq70fGkrauPQyGqsNI1STXpehrosMdTtggL/66ofTP/7+T2b/WCr6Xcx1arKnyGMaqjc6ZSP43tEbX6b1ZVtaylARWwP2NFWum3fW79JjqVYbRqpkhygZ6rrIULfBf3z9gzvwqBHGqoi1nFuGysxS64diacSr2DBJ6wu2tKShot6m+uTJE7MeS0vO+LXqHy2vqcpQ10WGui6Y3Acv/2L2h71F5Pufr/92XbPwcMtQvVvlEZ32hui05KlraUNFpCl7RuXe170taRJW/UuI8eocMtR1kaGuB2bKmKfVF46UTNXPDUPFKLxvk+kdnWKmpTfLGoaKPB2/F+/r8DDypbDqX0q5mdUyVB9syBJPBIvV8tuVoa7DWmaKCHLYbEfkuWGo3s69JTrlxgjTtoOYzl0zHjBlqJwHP+w51bwIPFbPJTXesdRRy3hSrLqXEh3+HDJUH9Z1CWq5Pvx2rDKD+LvoT+ns3aB7f/jTedVELOtzOdE/a0w1zw1D9b7Ds+UHSfrA+sJqNGWoXhiXxHxrzLVnxOiNqJeanGTVnYq20O6ciJRKXw4wN14sQ/VhXZeglusjQ12e37z60ez/LP39Z9+efv7Fd9k0LRHnv3/117PhWuVYau1vL4Ebhmr9QCy1TJDZkqHGMEGoZK9d1JI6i/FOBCMdvwRW3akwthL4vPf6znX4MtQ8uWskQ90X3mUx//zydVUUibFa5aUiStWSmnneGKp37SlRbAtbNVRgBm+JqTIztRfe7ECpkdVg1Zuqph1cX6usVHP3mAw1jwz1OHij03/541+uj6iDZThWuakUpc7zxlC9s3tbo7ItGyqUmmqvZTTe8eslXkBu1Zuq1tg999lcOl2Gmie3HEuGuh8wSqvvi0Wat8f4pmd8lYlRYpo3hkonZv1AUrUuGdm6oULJ+lA+2wOuq1V+qp5R8RRWvalqDdWbCZlChpqH87euS5AMdT94Jmv26ge90bAmJ01z7rm8Y3it6V7Yg6GCd6JSj2sS8E7eGY1VZ6paQ/Xea1PUGCoPK7z/lj2Er66uzmI2Mcufwr/5+1HIDR8sbahkcZ4/f/7mWj98+PB8/cO/+VvLvAwvfMdsdRnq5ZWNtIP/8m/uj5L7INxXoTxEeZxfTXkpTByy+r1UPZe0WOWnog9vhTanG/czk5kdmsK/WQEycsyWsq02BIX/x/aOtMXDuefyRg09orG9GKo3Su0ZMeYii6BaM/Ni1ZmqpQ1Weamm8BoqHRkdJd+P9Zkp0RnmOndP2rp2iZPnvosNMWdwtZqKND2GyvXDTDAX6zNT4vM9X52IUQfTtOqbEpP/uA+s4ZxQpjejh0J5pQ8N3r6yJ55Zv0SypdRu3o9IM/favJ9rimnXLNNE7FJFW6Y491xLduR7MVRPxx3UC2+dLRGGB6vOVFs21B4iwpjC04baJU6eB4C4Y96aofYQBlgbsWKCmJd3g5qcME/K5H4oMVFLtIkHDS+eFCzjpz3xjKN6+11MtMW8UrVshUhEXGPmU5pqy7nn8v5IesBTBg2Zk3dt1EhDBesaWOqFdxy1Z5rZwqozVa2hes9xiqUMFdExT5EbEqhZ4uS5NqnRHdFQEdeP6+GFyLY0G7GW5u6rGPo3q9+LhQH2pNVQ6d9Jk/Z6A44lZiSX4J3BXKO0Leeey/M0N/UDG4F3N4+Rhurt+FFPPOOooycmWXWmqjVUryFOsaShoqlsgCc1W5r29cz0TmfZH9VQkfc+b40c15Any7Q3Qx39BpxYXlMdaaZBBIGBc89lfeGplliuEdiCoZZ03D3JTSgJGolVX6paQ+U+ssqLNbe15dKGiqz0o+eBqzTt6/nu06jtyIaKPPM2rOO2Lk8EvjdD9bS3lzDu3Jgqf1/C4InGA3cYH7C+8FSjx+1itmCo3klJc51/Dd7x7JFY9aWqMVQ6EE80MdWZQ62hEvlTLirdCnHKGHOTk0rSvrUGPcrgpr6DmvpY1x2ufenxnmtoHTen+F6o2XY0Ve255YKUSzDUf/j9q3OdqGQbRJTbzIItGK3jUjEOzS5TtD8Wx3vbFCLmO94OqjYiqWELhupNI/Uez/Ru8DDy+7DqS1VTP2NHVlmp5h7evPcrnTgGRNrVigT4f96HF+4FC09bvGlfz/dulcUDMe2IZR0bq+Xh2Gsa/C44p6nJRfzNa2ac0xzWManCvWBBG72ZIRTuLWsWMHBuns1hpu6rAP2b1e/F2qOhYoRMuLIiTP4fWyFictaxseLI0MITnVJXDk/aGEOGO1vowFPWNlRvdIo8KakSPB0iGvl9WPWl8tZPZ8WEkZJxrqmOCjzXx4rkpvDe/1NtypmCty25Dr0kE2IdH2ukoRL9eWfo8lDjMZ5ce61jYnnP12OqnL/n/Ly/47myjmio8XjjHHzOOj7V1Bpcz/FEoF5y54Z5w9jcYSVrGiodp2eSVpC389gT1nkupZxxeDqqUsPwRF1TDxDUZX0+yJv2zd1zJXMYrONjjTRU/l6C54Em91BiHRPLe778lq3jY5Wcn8eg5x5ML9lQgajPKiPW1JpYT1tKNo3gs1YZsTB3GWpEqZnyNH5ErHNdSnSwc4wwVE9GYqpdnk44l/bl79Zxseai9hTr+FhbMlTP2HGuTOuYWCXn60lDe/HcV3P3xqUbqifVOtWWnBnXrN9lvNcqK4hzk6Few4Jr64afU67z3yvWuS4hzwPKCENtLTMXieQiLP5uHRdU+uBmlRFrS4YKVjmxljTU3PkhL6331aUbqidtO9WW3HnUXLdcmYzHXrShEl1gpCXje0ElY1p7wzrf0WIszZo8lLJFQ81FmLm0by4rUjpOb5URa2uGygODVVaQDHVaNcYwh6fvXcpQPWnWqbawXaH1+aARhkpbDmmoRI5sXzanktSupVwab89Y5ztSdKgeM4UtGirkUoVT94sn3eu9NgGrjFhbM9TWMq1jYslQ/WzJUMEqI9ZUW6zPxqq5brk0Mm05pKFyk1o3by+R4jsy1jmPEFFpadp8q4aa27BiKu2bO67mXrPKiVV6fWJkqDLUqX7X096tGOoI0RYZaqGIREojhr1hnXdPkR0omWQTs1VDzU1Omkr75oYbajIhVjmxSq9PjAxVhjrV73rae3hD5Qu1vuhUS7JVQyWiqjWCEqy6U7V0ijms+lLRWVhwfazPp5o6PsdWDRVynXFqjrlrxf1Wg1VWrJZ7p9X8LFrLtI6JVXK+ubYgLzLU2zq8oXo3MajtAGvYoqEuZaZeQ2rpFHNY9aWaux88nRLj2DVs2VBJX1vHBqVp39o0cQ6rrFgt906r+Vm0lmkdE6vkfD33rhcZ6m0d3lA9Xzqa60B7szVDZdLMEmYKW/g+rPpSzdXvPYeadKan7FLD6FkmD17W8ShN++bSvbX3nFVWrNLrEyNDXc5QPeswc9vvlXIUQ/VsXdhbRYbae4u9ObZkqEwKWXLMdAsZA6u+VLn6PR1Tbi9Ti57mF+hZZi7qDA8RuUxEy7Isq7xYpdcnptX8LFrLtI6JVXK+nvvWS+t9hflY/V6qnnjeY9qyO9FShprzEDa9py09xTKfO5iF9UWnKtn6rJWtGOqS5xzIdchBI7c8tOpLlTNUT2eCjjLLN5CbnBTSuLkHp5YHWKu8WKXXJ0aGuj1DLdlCbw42prfKT0W7LPZkqPx9BOe7w/qiU9X8UGrZiqGSolt6Rq/nB41GYtWXKmeo4DmX0mu8dUOFuY0KQtqXl2dbfw9qeWCyyotVen1ict9pTT/RWqZ1TKyS8/Xcs15a7yuvwYVXh7XiSTGjKQPfkqHm1oyy8cMIzneH5yZCS7EVQ0UPHjy4LnUZrDakqum0SrDqTOUxVE+Hgko6vD0Yam5yUi46bf1+rTJjlV6fmFxfUdP21jKtY2KVnG+uLchLj/vKs0F8r3FUT7qXVOkUWzJUT1tGcL47vGnGpSbmtBoqT/fczFPy/Ghi1UyeqcE7w3d0KtqqMxXX0UNuWzlUEqVSr1VGrLUNlXPJTU6y/n9QaRo8xSozlgx1Gk/f4KXHfeWNGqf6Qi8eA0Jz7w/1lLGUoVKP9flYU2PBLZzvjtwTdVDrD91Lq6HmwHDnOrxUS6V+t/I9WHWm8hqq95y8S0T2YKjA+Vjl5MR92XqvWeXGankgk6Eua6ikfb0zVn/5Zf5l2RYcZ5WXinbMjdduyVA96XJedN6b893hjYyW2nJvtKGCdzZt0BKp39xbS4JGZwqsOlN5DRU8r8RCnnHDvRiq9zeVqnbtaYxVbqya2dUBGeqyhgoeowoibfurr344G8oc/P3XX//oSvMG5frbLRkqeHykd5T65u7wRmxLRGpLGCp4fjyxRqZ+ua5Wnan4nkZj1ZuqxFC9Uapns4e9GCp40t2petxjnnofPnxY9VtuNT+L1jKtY2Lt3VAh9y5OSz/77NXpweevb6nERIOoP8fWDBWztI5J9Ysvvj+/HNwLn/3d65/MjMCbu8ObolpiPHEpQ91S6tdrOktkCax6U5UYKnij1Fy5ezLU0ixIy9rTGO+cCBS/gQmF2cdTyFDXMVQ68TU2K0DU6zGcrRkqlD6IWA8gQTygpJ9PZ1i/uTt6j3W1sJShwlZSv94HmtHjp2DVm6rUUHtFqXsyVG/WIajXZDPP+eQ0lX6Xoa5jqLCGqXrNFLZoqNRnHddLzMKOeXN3lPz4R0VpgSUNFTw/oli9o3Q6L6seS6OvPVj1pio1VPBGqXMPDXsyVCiZnOQZQ/biHY+f0tT322p+Fq1lWsfEOoqhAuZWk/6tEUtkvGYKWzRU8LSrRfF49Y27w3MzodrOxcvShrp26pfradWTirGxJbDqTlVjqN5swNykmb0Zqqds1Pu75f6sGcMN4ruyaDU/i9YyrWNilXx3nj7Qy6j7ig785198Z/aJvVTTt27VUGGkqcZp3xt3hzct1zJL0MPShgprpn5zm6QHTXVyvbHqTlVjqHTy3geXqXPdm6GCJzIf8d1yvT0GYWnqfFvNz6K1TOuYWEcz1ADRI0s/eqWBKYfyarcy3LKhApOURkT38a5LN+6Okg5v5FjeGoYKnh9TrB6pX+9DDOoZFc9h1Z2qxlCBDsQqL9VUFmCPhup5WBv53XKPlUarUybWan4WrWVax8Q6qqEGiFjZcIHxvFLDwEQ5juNzS21ybN1QA0SUpLOt8jzCn8gQUE6aEr91d3jHfEZGqWsZ6hqpX290usRkMDGG3Bj5Uuu7aQedPJ24JYyfvy+1I5oYAxEmxoVJ0kda4u+9NtXfM7nrhDBOPud54LhlqCUL0kdFqWsZKniiiVgtqd+S6JSOTuyTnKEusRRNCDEeM3/hTQ8RXY1IVa1pqOBJ+8Sq6RC5bt7odKnJSGIMLAWyvlfUa+2pEGJ9TEMtiZxIFfVmbUNdIvXLdbPKsjQqEyDGk/stjZiMJIRYh8kRdu+aQdR7zGVtQ4WRqd+StLoimP1Cmp6HLet7RTy0jZyMJIRYlklDJY1pdQKWcrvblLIFQ4VRqd/cy6Vjaex0f2CSV1dX5vcZS9GpEMdi0lChxFB6pn6ZisysqpxGz1KjY8TQvPJE6iWp3txyAbEu4ftmiODFixenZ8+enTedn4tKgzQuLsTxmDVUTMLqDKbE58U0up7HITdzd06kensPkwgh1mfWUKFkL9Ie6zKPCh2wJ3IJ6rVRuhhDycS9VFomI8QxyRoqBlky45XxQZnqTbgeJeOmmqyyfUoeNGNpxrYQxyVrqFD6NN57ktLeKTFTpAhm+5R+p4yZKs0rxLFxGSqUvg6KyRnidL4O1vWZ0lLb0Il6yB5Y350llj0pKhXiMnAbKp1IydpUdOmmWmqmXF+lercP4+HM1ibty0zsVIx/syRGEakQl4XbUIEOwjKCOWEql2YSnG+pmSJ1wEIIsV+KDBVKdxBClzRRifMsHV9DSgsKIcS+KTZUqJnhyEbwR4/AOD/vhvex9Go2IYTYP1WGCjWmyjrMo0ZinFfJOtMgmakQQhyDakMltel9zVsqNpI/SgqY8+B8rPPMSdvPCSHEcag2VGgxVaK5va+3pP01USniuh3loUIIIUSjoUKLqSI2gWAZwp6gvbVRKZKZCiHE8Wg2VGg1VcQyk60bK+2rWQ4TizFTmakQQhyPLoYaqJmolArD2tpsYNrTaqRIE5CEEOK4dDVUKHnf55xIBfN+yTWhftphta9UPd8XK4QQYnt0N1Rgsk7JG2pyYrwScxudKqV86mkZH03FddB7TYUQ4vgMMVRgvLF1XNUSuxA9fvz4bHytY66kcimH8mp2N8pJk4+EEOJyGGaogV4p4DlhhqRm2RZxDiJPPlezm1GJiEqV4hVCiMtiuKECkeCIaDUVb/qYwzqmt2jD1mcrCyGE6M8ihhogguw5tppqTUPlvLTBvRBCXC6LGiowpkg6dISxrmGoIb2rsVIhhLhsFjfUAGnRHutWYy1pqDJSIYQQMasZagBjxZju3r1rGleJljBU2knqWkYqhBAiZnVDjWH9KqZoGZlHIw2VaFrrSYUQQkyxKUMNEP0xwef+/fumuU2pp6GS0sVEaYeiUSGEEDk2aagxmBmRK2nhXPTaYqgYKMdTjyJRIYQQpWzeUC1Y10rkiPkRRWKEjG16DJXPoEePHp2Px6y1blQIIUQbp9P/AXD2zRKU3utuAAAAAElFTkSuQmCC\'); background-color: white; background-repeat: no-repeat; background-size:contain; background-position: center center; border: 1px solid black;\"><div style=\'padding: 5px;\'>My ad4 with cpm of a4ab3485f434f74f</div></div>',
          'price': 1,
          'crid': 'cr-cfy24'
        }
      ]
    });

    it('should register one bid', function() {
      assert.equal(bids.length, 1);
    });
    function getURLParam(url, key) {
      let val = '';
      if (url.indexOf('?') > -1) {
        let qs = url.substr(url.indexOf('?'));
        let qsArr = qs.split('&');
        for (let i = 0; i < qsArr.length; i++) {
          if (qsArr[i].indexOf(key.toLowerCase() + '=') > -1) {
            val = qsArr[i].split('=')[1]
            break;
          }
        }
      }
      return val;
    }
  });
});
