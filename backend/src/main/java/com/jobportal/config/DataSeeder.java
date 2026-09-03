// package com.jobportal.config;

// import org.springframework.boot.CommandLineRunner;
// import org.springframework.core.io.FileSystemResource;
// import org.springframework.jdbc.core.JdbcTemplate;
// import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
// import org.springframework.stereotype.Component;

// @Component
// public class DataSeeder implements CommandLineRunner {

//     private final JdbcTemplate jdbcTemplate;

//     public DataSeeder(JdbcTemplate jdbcTemplate) {
//         this.jdbcTemplate = jdbcTemplate;
//     }

//     @Override
//     public void run(String... args) throws Exception {

//         System.out.println("Clearing old data...");
//         jdbcTemplate.execute(
//             "TRUNCATE TABLE jobs, companies, categories, skills RESTART IDENTITY CASCADE;"
//         );
//         String[] files = {
//             "C:/WorkSpace/Web/Website-Analysis-and-Search-Career/data/example_data/03_base_data.sql",
//             "C:/WorkSpace/Web/Website-Analysis-and-Search-Career/data/example_data/03_company_data.sql",
//             "C:/WorkSpace/Web/Website-Analysis-and-Search-Career/data/example_data/03_jobs_data.sql"
//         };

//         for (String file : files) {
//             System.out.println("Executing: " + file);

//             try {
//                 ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
//                 populator.addScript(new FileSystemResource(file));
//                 populator.setSqlScriptEncoding("UTF-8");
//                 populator.setContinueOnError(true); // Ignore errors (duplicate keys, etc.) and continue
//                 populator.execute(jdbcTemplate.getDataSource());
                
//                 System.out.println("Done: " + file);
//             } catch (Exception e) {
//                 System.out.println("Error reading or executing file: " + file);
//                 e.printStackTrace();
//             }
//         }
        
//         System.out.println("Database reseeded successfully.");
//     }
// }