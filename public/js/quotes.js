// This file is for the quotes.ejs page, which is the page that displays all the quotes and their authors. We will add an event listener to each author name, so that when the user clicks on an author name, we will display a modal with the author's information and their quotes.
// A modal is a pop-up window that appears on top of the current page, and it can be used to display additional information without navigating away from the current page. In this case, we will use a modal to display the author's information and their quotes when the user clicks on an author name.
let authorLinks = document.querySelectorAll(".authorNames");
        for (let i of authorLinks) {
            i.addEventListener("click", displayAuthorInfo);
        }

        // ADDED 'event' parameter here so we can properly stop the link from jumping.
        // Relying on a hidden/global 'event' is deprecated and can cause errors in some modern browsers, 
        // so we explicitly catch it in the parentheses.
        async function displayAuthorInfo(event){
            // prevent the <a> tag from jumping to the top of the page
            event.preventDefault();

            let authorId = this.getAttribute("authorId");
            // alert("displaying author info for authorId..... " + authorId);
            let url = "/api/author/" + authorId;
            let response = await fetch(url);
            let data = await response.json(); //data is everything from API route, which is author info and their quotes
            
            console.log(data[0].firstName); //data is an array of objects, we want the first object, and then the firstName property of that object
            
            // Populating the modal with the author's info using data[0] just like we did in class
            document.querySelector("#authorName").textContent = data[0].firstName + " " + data[0].lastName;
            document.querySelector("#authorPicture").src = data[0].portrait;
            document.querySelector("#authorProfession").textContent = data[0].profession;
            
            // ADDED: Populating the new fields required by the rubric (Born, Country, Bio)
            // FIX: Use .split("T")[0] to chop off the time and timezone characters from the date string, leaving just the date in YYYY-MM-DD format. This is necessary because the database stores dates in a datetime format, which includes time and timezone information that we don't want to display on the frontend.
            document.querySelector("#authorDob").textContent = data[0].dob.split("T")[0];
            document.querySelector("#authorCountry").textContent = data[0].country;
            document.querySelector("#authorBio").textContent = data[0].biography;
            
            // check if the author is still alive
            // Using a standard if/else block to make the logic easy to visualize
            if (data[0].dod != null) {
                // If the database has a Date of Death, display it
                document.querySelector("#authorDod").textContent = data[0].dod.split("T")[0]; 
            } else {
                // If the Date of Death is null, display the word "Present"
                document.querySelector("#authorDod").textContent = "Present"; 
            }

            //enable the modal
            document.querySelector("#authorModal").showModal();
        }

        document.querySelector("#closeModal").addEventListener("click", ()=>{   
            document.querySelector("#authorModal").close();
        });