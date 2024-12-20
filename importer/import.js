import library from './library.json' with { type: "json" };
// import BookLibrary from './api.js';
import PocketBase from 'pocketbase'

const pb = new PocketBase('http://100.106.167.123:9480');
// const userData = await pb.collection('users').authWithPassword('test@example.com', '123456');
pb.autoCancellation(false);

// const pb = new BookLibrary('http://100.106.167.123:9480', 'books');

// const books = await pb.get('books');

// console.log(books);

async function processBook(book) {
    
    // Search for a book with the same ASIN in the library
    console.log('---\n');
    console.log('Book processing - ' + book.asin + '\n');
    
    if ( ! book.narrators ) return;

    try {
        const bookEntry = await pb.collection('books').getFirstListItem('asin="' + book.asin + '"');
        
        if (bookEntry) console.log('The book already exists, next ...');
        
    } catch (error) {
        
        console.log('Creating new book record for ASIN: ' + book.asin + '\n');
        
        const bookObject = { 
            
            isbn: '',
            asin: book.asin,
            title: book.title,
            subtitle: book.subtitle,
            
            authors: [],
            narrators: [],
            genres: [],
            
            runtime_length_min: book.runtime_length_min,
            cover_url_amazon: book.cover_url,
            date_released: book.release_date,
            date_added: book.date_added,
            date_purchased: book.purchase_date,
            rating: book.rating,
            rating_count: book.num_ratings,
            percent_complete: book.percent_complete,
            is_finished: book.is_finished,   
        }
        
        if ( book.hasOwnProperty('series_title') ) bookObject.series_title = book.series_title;
        if ( book.hasOwnProperty('series_sequence') ) bookObject.series_sequence = book.series_sequence;
        
        // authors
        
        const authorsList = book.authors.split(', ');
        
        for await ( const author of authorsList ) {
            
            try {
                const result = await pb.collection('authors').getFirstListItem('name="' + author + '"');
                
                if ( ! result.id ) {
                    console.error('result.id is empty');
                } else {
                    bookObject.authors.push(result.id);
                }
                
            } catch (error) {
                
                // console.log(error);
                
                if ( error.name === 'ClientResponseError 404' ) {
                    const result = await pb.collection('authors').create({ name: author });
                    bookObject.authors.push(result.id);
                }
            }
            
        }
        
        // narrators
        
        const narratorsList = book.narrators.split(', ');
        
        for await ( const narrator of narratorsList ) {
            
            try {
                const result = await pb.collection('narrators').getFirstListItem('name="' + narrator + '"');
                
                if ( ! result.id ) {
                    console.error('result.id is empty');
                } else {
                    bookObject.narrators.push(result.id);
                }
                
            } catch (error) {
                
                // console.log(error);
                
                if ( error.name === 'ClientResponseError 404' ) {
                    const result = await pb.collection('narrators').create({ name: narrator });
                    bookObject.narrators.push(result.id);
                }
            }
            
        }
        
        // genres 
        
        if ( book.genres ) {

            const genresList = book.genres.split(', ');
            
            for await ( const genre of genresList ) {
                
                try {
                    const result = await pb.collection('genres').getFirstListItem('name="' + genre + '"');
                    
                    if ( ! result.id ) {
                        console.error('result.id is empty');
                    } else {
                        bookObject.genres.push(result.id);
                    }
                    
                } catch (error) {
                    
                    // console.log(error);
                    
                    if ( error.name === 'ClientResponseError 404' ) {
    
                        try {
                            const result = await pb.collection('genres').create({ name: genre });
                            bookObject.genres.push(result.id);
                        } catch (error) {
                            console.log(`Error while creating genre (${genre}) for book (${book.asin})`);
                        }
                    }
                }
                
            }
        }
        
        // Create book
        try {
            const result = await pb.collection('books').create(bookObject);
        } catch (error) {
            console.log('Error while creating book: ' + book.asin, error);
        }
    }
    
}

library.forEach(processBook);