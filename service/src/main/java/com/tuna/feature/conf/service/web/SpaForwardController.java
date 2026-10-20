package com.tuna.feature.conf.service.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Sends the UI's client-side routes to {@code index.html}, so an address such as {@code /projects/3/features} works
 * when it is typed in or reloaded; the UI's router then draws the page. {@code /} is served by Spring Boot's welcome
 * page, and {@code /api/**}, {@code /api-docs}, Swagger, {@code /h2-console} and the static files are not touched.
 *
 * <p>Every UI route lives under {@code /projects} (see {@code ui/src/App.tsx}). A new top-level UI route needs a
 * mapping here too.
 */
@Controller
public class SpaForwardController {

    @GetMapping({"/projects", "/projects/**"})
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
